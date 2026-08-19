const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const pdf = require('pdf-parse');
const axios = require('axios');
const Tesseract = require('tesseract.js');

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Configuration
const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_EMBED_URL = "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5";
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const PRIMARY_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const BACKUP_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("🔓 Backend using Service Role Key (Bypassing RLS)");
} else {
    console.warn("⚠️ Backend using Anon Key. Document processing might fail if RLS is enabled.");
}

// --- Helper Functions ---

async function getEmbedding(text) {
    try {
        const response = await axios.post(HF_EMBED_URL,
            { inputs: text.substring(0, 1000) },
            { headers: { "Authorization": `Bearer ${HF_TOKEN}` } }
        );

        let result = response.data;
        // Handle different response formats from Hugging Face
        if (Array.isArray(result) && Array.isArray(result[0])) result = result[0];
        return result;
    } catch (error) {
        console.error("❌ Embedding failure:", error.response?.data || error.message);
        return null;
    }
}

function chunkText(text, size = 1000) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += size) {
        chunks.push(words.slice(i, i + size).join(' '));
    }
    return chunks;
}

async function callAI(messages, retries = 3, useBackup = false) {
    const model = useBackup ? BACKUP_MODEL : PRIMARY_MODEL;
    try {
        const response = await axios.post(ROUTER_URL,
            {
                model: model,
                messages: messages,
                max_tokens: 1500,
                temperature: 0.7,
            },
            {
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json",
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(`❌ AI Error (${model}):`, error.response?.data || error.message);
        if ((error.response?.status === 429 || error.response?.status === 503) && retries > 0) {
            await new Promise(r => setTimeout(r, 2000));
            return callAI(messages, retries - 1, useBackup);
        }
        if (!useBackup) return callAI(messages, retries, true);
        throw error;
    }
}

// --- Document Processing Helper ---

async function processDocument(docId) {
    console.log(`📄 Processing document: ${docId}`);

    const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single();

    if (fetchError || !doc) {
        console.error("❌ Supabase Fetch Error:", fetchError?.message || "No document returned");
        throw new Error("Document not found");
    }

    const signedUrlResult = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
    if (signedUrlResult.error) throw signedUrlResult.error;

    const fileResponse = await axios.get(signedUrlResult.data.signedUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(fileResponse.data);

    let text = "";
    const lowerPath = doc.file_path.toLowerCase();

    if (lowerPath.endsWith('.pdf')) {
        console.log("📑 Processing PDF...");
        const pdfData = await pdf(buffer);
        text = pdfData.text;
    } else if (lowerPath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        console.log("🖼️ Processing IMAGE with OCR...");
        const { data: { text: extractedText } } = await Tesseract.recognize(buffer, 'eng');
        text = extractedText;
        console.log(`✅ OCR Complete. Extracted ${text.length} chars.`);
    } else {
        text = buffer.toString('utf-8');
    }

    if (!text || text.trim().length < 5) {
        throw new Error("Text extraction failed or content too short.");
    }

    // Clear and Update Chunks
    await supabase.from('document_chunks').delete().eq('document_id', docId);

    const chunks = chunkText(text, 500);
    console.log(`Debug: Split into ${chunks.length} chunks.`);
    let successCount = 0;

    for (const [i, chunk] of chunks.entries()) {
        const embedding = await getEmbedding(chunk);

        if (embedding && Array.isArray(embedding)) {
            const { error: insertError } = await supabase.from('document_chunks').insert({
                document_id: docId,
                content: chunk,
                embedding: embedding
            });

            if (insertError) {
                console.error(`❌ Insert Error Chunk ${i}:`, insertError.message);
            } else {
                successCount++;
            }
        } else {
            console.error(`⚠️ Embedding failed for chunk ${i + 1}`);
        }
    }

    if (successCount === 0) {
        console.error("❌ Stats: Chunks:", chunks.length, "Success:", successCount);
        if (chunks.length > 0) {
            throw new Error(`Embedding API Failed for all ${chunks.length} chunks. Check HuggingFace Token/Quota.`);
        } else {
            throw new Error("No text chunks could be created from document.");
        }
    }

    await supabase.from('documents').update({ status: 'ready' }).eq('id', docId);
    console.log(`🎉 Processed ${successCount}/${chunks.length} chunks for doc: ${doc.title || docId}`);
    return { success: true, chunks: successCount };
}

// --- Routes ---

app.get('/health', (req, res) => {
    res.json({ status: 'ok', ocr: 'enabled' })
})

app.post('/api/documents/:id/process', async (req, res) => {
    const docId = req.params.id;
    try {
        const result = await processDocument(docId);
        res.json(result);
    } catch (error) {
        console.error("❌ Processing error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, documentIds = [], conversationHistory = [] } = req.body;
        let context = "";

        if (documentIds.length > 0) {
            // 1. Ensure all selected documents have chunks processed
            for (const docId of documentIds) {
                const { count } = await supabase
                    .from('document_chunks')
                    .select('id', { count: 'exact', head: true })
                    .eq('document_id', docId);

                if (!count || count === 0) {
                    console.log(`⚠️ Document ${docId} has no chunks. Auto-processing on demand...`);
                    try {
                        await processDocument(docId);
                    } catch (err) {
                        console.error(`⚠️ Auto-process failed for document ${docId}:`, err.message);
                    }
                }
            }

            // 2. Perform semantic vector search
            let chunks = [];
            const queryEmbedding = await getEmbedding(message);
            if (queryEmbedding) {
                const { data: matchedChunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.05,
                    match_count: 15,
                    filter_document_ids: documentIds
                });

                if (matchedChunks && matchedChunks.length > 0) {
                    chunks = matchedChunks;
                }
            }

            // 3. Fallback to direct chunk fetch if semantic search returned no chunks
            if (chunks.length === 0) {
                console.log("ℹ️ Semantic search returned 0 chunks. Falling back to direct document chunks...");
                const { data: directChunks } = await supabase
                    .from('document_chunks')
                    .select('content, page_number')
                    .in('document_id', documentIds)
                    .limit(15);

                if (directChunks && directChunks.length > 0) {
                    chunks = directChunks;
                }
            }

            if (chunks && chunks.length > 0) {
                context = chunks.map((c, i) => `[Excerpt ${i + 1}${c.page_number ? `, Page ${c.page_number}` : ''}]: ${c.content}`).join('\n\n---\n\n');
                console.log(`✅ Found and supplied ${chunks.length} context chunks to AI.`);
            } else {
                console.log("⚠️ No relevant document chunks found.");
            }
        }

        const systemPrompt = `You are StudyMate+, an intelligent AI tutor.
        
INSTRUCTIONS:
1. Context First: Always prioritize the provided "DOC CONTEXT" (user's files).
2. Strict Retrieval: If the answer is in the context, explain it clearly using that information.
3. If asked to summarize, explain, or answer questions about the document, synthesize directly from the provided DOC CONTEXT.
4. General Knowledge Fallback: If no document context is provided at all, you MAY answer using your general knowledge.
5. Disclaimer: If you use general knowledge, you MUST start with a phrase like: "This isn't explicitly in your documents, but generally..." to let the user know.

Do not refuse to answer unless the question is harmful.`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-6).map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            {
                role: "user",
                content: context
                    ? `DOC CONTEXT:\n${context}\n\nUSER QUESTION: ${message}`
                    : `USER QUESTION: ${message}\n\n(No document context found for this query)`
            }
        ];

        const response = await callAI(messages);
        res.json({ success: true, response });
    } catch (error) {
        console.error("❌ Chat error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/flashcards', async (req, res) => {
    try {
        const { documentId, count = 5 } = req.body;
        const requestedCount = Math.max(1, Math.min(parseInt(count) || 5, 20));

        // 1. Ensure document has chunks
        let { data: chunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', documentId)
            .limit(15);

        if (!chunks || chunks.length === 0) {
            console.log(`⚠️ Document ${documentId} has no chunks for Flashcards. Starting Auto-Analysis...`);
            await processDocument(documentId);
            const refetched = await supabase.from('document_chunks').select('content').eq('document_id', documentId).limit(15);
            chunks = refetched.data || [];
        }

        if (!chunks || chunks.length === 0) {
            throw new Error("No document content available for flashcard generation.");
        }

        const context = chunks.map(c => c.content).join('\n\n');

        const systemPrompt = `You are a study helper. Based on the provided context, generate exactly ${requestedCount} high-quality, comprehensive flashcards covering key definitions, concepts, formulas, and takeaways.
Return ONLY a valid JSON object in this format: 
{ "flashcards": [ { "question": "...", "answer": "...", "tag": "Core Concept | Definition | Key Takeaway" } ] }`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context.substring(0, 6000)}` }
        ];

        const rawOutput = await callAI(messages);

        const jsonStart = rawOutput.indexOf('{');
        const jsonEnd = rawOutput.lastIndexOf('}');
        const jsonStr = rawOutput.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        res.json({ success: true, flashcards: data.flashcards });
    } catch (error) {
        console.error("❌ Flashcards generation error:", error.message);
        res.status(422).json({ error: error.message });
    }
});

app.post('/api/ai/quiz', async (req, res) => {
    try {
        const { documentId, count = 5, difficulty = 'medium' } = req.body;
        const requestedCount = Math.max(1, Math.min(parseInt(count) || 5, 20));

        // 1. Ensure document has chunks
        let { data: chunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', documentId)
            .limit(15);

        if (!chunks || chunks.length === 0) {
            console.log(`⚠️ Document ${documentId} has no chunks for Quiz. Starting Auto-Analysis...`);
            await processDocument(documentId);
            const refetched = await supabase.from('document_chunks').select('content').eq('document_id', documentId).limit(15);
            chunks = refetched.data || [];
        }

        if (!chunks || chunks.length === 0) {
            throw new Error("No document content available for quiz generation.");
        }

        const context = chunks.map(c => c.content).join('\n\n');

        const systemPrompt = `Based on the provided context, generate a ${requestedCount}-question multiple choice quiz with ${difficulty} difficulty.
For each question provide:
- "question": clear question statement
- "options": 4 distinct choices
- "correct_answer": exact text of the correct choice
- "explanation": 1-2 sentence concise explanation of why the correct answer is right

Return ONLY a valid JSON object in this format: 
{ "quiz": [ { "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "...", "explanation": "..." } ] }`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context.substring(0, 6000)}` }
        ];

        const rawOutput = await callAI(messages);
        const jsonStart = rawOutput.indexOf('{');
        const jsonEnd = rawOutput.lastIndexOf('}');
        const jsonStr = rawOutput.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        res.json({ success: true, quiz: data.quiz });
    } catch (error) {
        console.error("❌ Quiz generation error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// AI Study Plan Generator Route
app.post('/api/ai/study-plan', async (req, res) => {
    try {
        const { title, documentIds, deadline, hoursPerDay } = req.body;
        if (!title) return res.status(400).json({ error: "Plan title is required" });

        let docTitles = [];
        let contextSnippets = [];

        if (documentIds && documentIds.length > 0) {
            const { data: docs } = await supabase
                .from('documents')
                .select('id, title')
                .in('id', documentIds);

            if (docs) docTitles = docs.map(d => d.title);

            const { data: chunks } = await supabase
                .from('document_chunks')
                .select('content')
                .in('document_id', documentIds)
                .limit(10);

            if (chunks) contextSnippets = chunks.map(c => c.content);
        }

        const systemPrompt = `You are an expert AI Academic Study Planner. Create a structured, practical study plan for a student.
Title: ${title}
Target Deadline: ${deadline || 'Upcoming Exam'}
Daily Study Target: ${hoursPerDay || 1} hour(s) per day
Documents / Topics to Cover: ${docTitles.length > 0 ? docTitles.join(', ') : 'General Course Material'}

Generate a list of 4 to 6 actionable milestone study tasks.
Return ONLY a valid JSON object in this exact format:
{
  "tasks": [
    { "id": "1", "title": "...", "completed": false, "category": "Reading" },
    { "id": "2", "title": "...", "completed": false, "category": "Practice" }
  ]
}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Study Material Context:\n${contextSnippets.join('\n\n').substring(0, 4000) || 'Study preparation for ' + title}` }
        ];

        const rawOutput = await callAI(messages);
        const jsonStart = rawOutput.indexOf('{');
        const jsonEnd = rawOutput.lastIndexOf('}');
        const jsonStr = rawOutput.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        res.json({ success: true, tasks: data.tasks || [] });
    } catch (error) {
        console.error("❌ Study plan generation error:", error.message);
        // Return sensible fallback tasks if AI call fails
        const fallbackTasks = [
            { id: "1", title: "Review foundational concepts & key notes", completed: false, category: "Review" },
            { id: "2", title: "Generate & practice flashcards on key topics", completed: false, category: "Active Recall" },
            { id: "3", title: "Take adaptive AI practice quiz", completed: false, category: "Testing" },
            { id: "4", title: "Final summary & weak spot revision", completed: false, category: "Revision" }
        ];
        res.json({ success: true, tasks: fallbackTasks });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StudyMate+ Backend running on http://127.0.0.1:${PORT}`)
})
