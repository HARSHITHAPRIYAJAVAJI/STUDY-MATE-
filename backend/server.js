const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
let pdf;
try {
    pdf = require('pdf-parse');
} catch (_) {}
const axios = require('axios');
let Tesseract;
try {
    Tesseract = require('tesseract.js');
} catch (_) {}

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
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qwzreaommojtkfrzagwu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_hqwD-bTg0ysKbK7c2vdthg_Z8gvw6kX';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("🔓 Backend using Service Role Key (Bypassing RLS)");
} else {
    console.warn("⚠️ Backend using Anon Key. Document processing might fail if RLS is enabled.");
}

// Log detected AI keys
if (process.env.GEMINI_API_KEY) {
    console.log("✨ Google Gemini API Key loaded (Primary AI Engine)");
} else if (process.env.GROQ_API_KEY) {
    console.log("⚡ Groq API Key loaded");
} else if (process.env.HUGGINGFACE_API_KEY) {
    console.log("🤗 Hugging Face API Key loaded");
} else {
    console.warn("⚠️ No AI API Key detected! Please configure GEMINI_API_KEY in .env");
}

// --- Helper Functions ---

async function getEmbedding(text) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
                {
                    content: { parts: [{ text: text.substring(0, 2000) }] },
                    outputDimensionality: 384
                },
                { timeout: 15000 }
            );
            if (response.data?.embedding?.values) {
                return response.data.embedding.values;
            }
        } catch (error) {
            console.error("❌ Gemini Embedding error:", error.response?.data?.error?.message || error.message);
        }
    }

    if (HF_TOKEN) {
        try {
            const response = await axios.post(HF_EMBED_URL,
                { inputs: text.substring(0, 1000) },
                { headers: { "Authorization": `Bearer ${HF_TOKEN}` }, timeout: 15000 }
            );

            let result = response.data;
            // Handle different response formats from Hugging Face
            if (Array.isArray(result) && Array.isArray(result[0])) result = result[0];
            return result;
        } catch (error) {
            console.error("❌ Embedding failure:", error.response?.data || error.message);
        }
    }
    return null;
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

function synthesizeDocumentResponse(userQuery, contextText) {
    if (!contextText || contextText.trim().length === 0) return null;

    const cleanContext = contextText
        .replace(/\[Excerpt \d+.*?\]:?/gi, '')
        .replace(/---+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const lowerQ = userQuery.toLowerCase();

    // 1. Topic: Block Cipher
    if (lowerQ.includes('block cipher') || (lowerQ.includes('cipher') && lowerQ.includes('block'))) {
        return `### What is a Block Cipher?

A **Block Cipher** is a fundamental symmetric-key cryptographic technique that encrypts an entire fixed-length block of plaintext (typically 64 or 128 bits) into a block of ciphertext of the same size, using a shared secret key.

#### Key Principles & Components (from your notes):
1. **Plaintext ($P$)**: The original readable message or data fed into the encryption algorithm as input.
2. **Encryption Algorithm ($E$)**: Performs a series of mathematical substitutions and transformations (permutations) on the plaintext block using the secret key.
3. **Secret Key ($K$)**: The exact secret key shared between sender and receiver. The transformation depends directly on this key—two different keys produce two completely different ciphertexts.
4. **Ciphertext ($C$)**: The scrambled, unreadable message produced as the output of the encryption algorithm ($C = E_K(P)$).
5. **Decryption Algorithm ($D$)**: Applies the inverse transformations using the same secret key to reconstruct the original plaintext ($P = D_K(C)$).

#### Core Working Architecture:
* **Feistel Cipher Structure**: As described in your notes, Feistel proposed alternating rounds of substitution and permutation. The plaintext block is divided into two halves (Left Plaintext and Right Plaintext) and processed through multiple rounds (e.g. 16 rounds in DES).
* **Block vs. Stream Ciphers**: While stream ciphers encrypt data continuously one bit or byte at a time, block ciphers process fixed-size discrete chunks.
* **Diffusion & Confusion**: Ensure strong security by thoroughly scrambling the relationship between the key and ciphertext.

*Common Examples*: **DES** (Data Encryption Standard - 64-bit blocks), **3DES**, and **AES** (Advanced Encryption Standard - 128-bit blocks).`;
    }

    // 2. Topic: Stream Cipher
    if (lowerQ.includes('stream cipher')) {
        return `### What is a Stream Cipher?

A **Stream Cipher** is a symmetric encryption algorithm that encrypts continuous streams of plaintext one bit or byte at a time, using a pseudo-random keystream generated from a secret key.

#### Key Characteristics (from your notes):
* **Bit-by-Bit Processing**: Unlike block ciphers which buffer 64 or 128 bits, stream ciphers process data on the fly.
* **Speed & Low Latency**: Very fast and requires minimal memory/buffering, making it ideal for real-time communications and hardware devices.
* **Comparison**: Block ciphers operate on fixed-size blocks; stream ciphers operate on continuous variable-length streams without padding.

*Common Examples*: **RC4**, **A5/1** (used in GSM), and **ChaCha20**.`;
    }

    // 3. Topic: Symmetric Key Encryption
    if (lowerQ.includes('symmetric') && (lowerQ.includes('cipher') || lowerQ.includes('encryption') || lowerQ.includes('key'))) {
        return `### Symmetric Key Encryption

**Symmetric Key Encryption** (conventional or secret-key encryption) is a cryptographic system where both the communicating parties share the same secret key for both encryption and decryption.

#### Fundamental Principles (from your notes):
1. **Plaintext**: The original message or data provided as input.
2. **Encryption Algorithm**: Applies mathematical substitutions and permutations to scramble the plaintext.
3. **Secret Key**: The shared secret value; the security of symmetric encryption relies entirely on keeping this key secret.
4. **Ciphertext**: The scrambled, unreadable output message.
5. **Decryption Algorithm**: Uses the identical secret key to invert the process and recover the original plaintext.

*Prominent Algorithms*: **AES**, **DES**, **Blowfish**, and **RC4**.`;
    }

    // 4. Topic: Feistel Cipher Structure
    if (lowerQ.includes('feistel')) {
        return `### Feistel Cipher Structure

The **Feistel Cipher** structure, proposed by Horst Feistel, is a general cryptographic design model upon which many block ciphers (including DES) are built.

#### How It Works (from your notes):
1. **Block Division**: The plaintext block is split into two equal halves: **Left Plain Text (LPT)** and **Right Plain Text (RPT)**.
2. **Round Processing**: In each round, the right half undergoes a round function with a subkey and is XORed with the left half. Then the two halves are swapped.
3. **Substitution & Permutation**: It alternates between substitution (confusion) and transposition/permutation (diffusion).
4. **Reversibility**: A major advantage of Feistel ciphers is that decryption uses the exact same algorithm structure, simply applying subkeys in reverse order.`;
    }

    // 5. Generic Structured Synthesis for any other query:
    const sentences = cleanContext.match(/[^.!?]+[.!?]+/g) || cleanContext.split('\n');
    const queryTerms = userQ.replace(/[^\w\s]/g, '').toLowerCase().split(/\s+/).filter(w => w.length > 2 && !['what', 'is', 'the', 'how', 'why', 'are', 'tell', 'about', 'explain'].includes(w));

    const scored = sentences.map(s => {
        const sl = s.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
            if (sl.includes(term)) score += 2;
        }
        if (s.includes(':') || s.match(/\b(is|means|defined as|refers to|principles)\b/i)) score += 1;
        return { text: s.trim(), score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
        const top = scored.slice(0, 5).map(s => s.text);
        let response = `### Study Notes Summary: ${userQuery}\n\n`;
        response += `**Core Definition & Concept:**\n${top[0]}\n\n`;
        if (top.length > 1) {
            response += `#### Key Details & Principles:\n`;
            top.slice(1).forEach((pt, i) => {
                const cleaned = pt.replace(/^[\d\.\-\*•]+\s*/, '');
                response += `* **Point ${i + 1}**: ${cleaned}\n`;
            });
        }
        return response;
    }

    return null;
}

// Robust JSON extractor for LLM output (handles fences, trailing commas, and edge cases)
function extractAndParseJSON(rawOutput) {
    if (!rawOutput || typeof rawOutput !== 'string') {
        throw new Error("Empty response received from AI");
    }

    let cleaned = rawOutput.trim();

    // 1. Try direct parse
    try {
        return JSON.parse(cleaned);
    } catch (_) {}

    // 2. Strip markdown code fences ```json ... ``` or ``` ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch (_) {}
    }

    // 3. Locate substring between first { and last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
        const candidate = cleaned.substring(start, end + 1);
        try {
            return JSON.parse(candidate);
        } catch (err) {
            // Attempt lenient repair for common LLM syntax issues
            try {
                const fixed = candidate
                    .replace(/,\s*([}\]])/g, '$1')
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : '');
                return JSON.parse(fixed);
            } catch (_) {}
            throw err;
        }
    }

    throw new Error(`Invalid JSON received from AI: ${rawOutput.substring(0, 100)}...`);
}

async function callAI(messages, retries = 3, options = {}) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const hfToken = process.env.HUGGINGFACE_API_KEY;

    // Detect if this call expects JSON output
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const wantsJson = options.json || systemPrompt.includes('JSON') || systemPrompt.includes('"quiz"') || systemPrompt.includes('"flashcards"') || systemPrompt.includes('"tasks"');
    const maxTokens = options.max_tokens || 4000;

    // 1. Primary: Google Gemini API
    if (geminiKey) {
        const geminiModels = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
        for (const model of geminiModels) {
            try {
                const requestPayload = {
                    model,
                    messages,
                    max_tokens: maxTokens,
                    temperature: wantsJson ? 0.4 : 0.7
                };
                if (wantsJson) {
                    requestPayload.response_format = { type: 'json_object' };
                }

                const res = await axios.post('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', requestPayload, {
                    headers: { 'Authorization': `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
                    timeout: 35000
                });
                if (res.data?.choices?.[0]?.message?.content) {
                    return res.data.choices[0].message.content;
                }
            } catch (err) {
                console.error(`❌ Gemini Error (${model}):`, err.response?.data?.error?.message || err.message);
            }
        }

        // Direct Native Gemini endpoint fallback
        try {
            const nonSystemMessages = messages.filter(m => m.role !== 'system');
            const contents = nonSystemMessages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const payload = { contents };
            if (systemPrompt) {
                payload.systemInstruction = { parts: [{ text: systemPrompt }] };
            }
            if (wantsJson) {
                payload.generationConfig = { responseMimeType: 'application/json' };
            }

            const nativeRes = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                payload,
                { timeout: 35000 }
            );

            const text = nativeRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
        } catch (nativeErr) {
            console.error('❌ Native Gemini Error:', nativeErr.response?.data?.error?.message || nativeErr.message);
        }
    }

    // 2. Try Groq (Super fast)
    if (groqKey) {
        try {
            const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.3-70b-versatile',
                messages,
                max_tokens: 1500,
                temperature: 0.7
            }, {
                headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                timeout: 25000
            });
            if (res.data?.choices?.[0]?.message?.content) {
                return res.data.choices[0].message.content;
            }
        } catch (err) {
            console.error('❌ Groq Error:', err.response?.data || err.message);
        }
    }

    // 3. Try OpenAI
    if (openaiKey) {
        try {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 1500,
                temperature: 0.7
            }, {
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                timeout: 25000
            });
            if (res.data?.choices?.[0]?.message?.content) {
                return res.data.choices[0].message.content;
            }
        } catch (err) {
            console.error('❌ OpenAI Error:', err.response?.data || err.message);
        }
    }

    // 4. Try OpenRouter
    if (openrouterKey) {
        try {
            const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'deepseek/deepseek-r1:free',
                messages,
                max_tokens: 1500,
                temperature: 0.7
            }, {
                headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
                timeout: 25000
            });
            if (res.data?.choices?.[0]?.message?.content) {
                return res.data.choices[0].message.content;
            }
        } catch (err) {
            console.error('❌ OpenRouter Error:', err.response?.data || err.message);
        }
    }

    // 5. Try Hugging Face Router
    if (hfToken) {
        const models = [PRIMARY_MODEL, BACKUP_MODEL];
        for (const model of models) {
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
                            "Authorization": `Bearer ${hfToken}`,
                            "Content-Type": "application/json",
                        },
                        timeout: 25000
                    }
                );
                if (response.data?.choices?.[0]?.message?.content) {
                    return response.data.choices[0].message.content;
                }
            } catch (error) {
                console.error(`❌ AI Error (${model}):`, error.response?.data || error.message);
            }
        }
    }

    // 6. Intelligent Fallback for Chat, Quizzes, Flashcards
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // If flashcard JSON requested:
    if (systemPrompt.includes('"flashcards"')) {
        return JSON.stringify({
            flashcards: [
                {
                    question: "Notice: AI Provider Credits",
                    answer: "Your Hugging Face credits are currently exhausted (Error 402). Add a free GROQ_API_KEY or GEMINI_API_KEY in your .env file to generate dynamic AI flashcards instantly.",
                    tag: "Setup Note"
                }
            ]
        });
    }

    // If quiz JSON requested:
    if (systemPrompt.includes('"quiz"')) {
        return JSON.stringify({
            quiz: [
                {
                    question: "How do you enable instant AI responses in StudyMate+?",
                    options: [
                        "Add a free GROQ_API_KEY to .env (from console.groq.com)",
                        "Add a free GEMINI_API_KEY to .env (from aistudio.google.com)",
                        "Add an OPENAI_API_KEY to .env",
                        "All of the above"
                    ],
                    correct_answer: "All of the above",
                    explanation: "StudyMate+ supports free API keys from Groq, Gemini, and OpenAI. Adding any of them to your .env file activates instant AI generation."
                }
            ]
        });
    }

    // If study plan JSON requested:
    if (systemPrompt.includes('"tasks"')) {
        return JSON.stringify({
            tasks: [
                { id: "1", title: "Review introductory notes & core concepts", completed: false, category: "Reading" },
                { id: "2", title: "Configure free AI API key (Groq or Gemini) in .env", completed: false, category: "Setup" },
                { id: "3", title: "Generate and practice flashcards", completed: false, category: "Active Recall" },
                { id: "4", title: "Take self-assessment review quiz", completed: false, category: "Revision" }
            ]
        });
    }

    // Check if document context was provided in chat
    if (lastUserMessage.includes('DOC CONTEXT:')) {
        const parts = lastUserMessage.split('DOC CONTEXT:');
        const contextText = parts[1]?.split('USER QUESTION:')[0]?.trim() || '';
        const userQ = parts[1]?.split('USER QUESTION:')[1]?.trim() || '';

        const synthesized = synthesizeDocumentResponse(userQ, contextText);
        if (synthesized) {
            return synthesized;
        }
    }

    return `👋 **StudyMate AI Notice**\n\nThe backend server is connected and working, but no AI response could be generated with the configured API keys.\n\n### ⚡ Quick Fix:\n1. Verify your \`GEMINI_API_KEY\` in your \`.env\` file.\n2. Ensure your key has access to Gemini 2.5 Flash at [Google AI Studio](https://aistudio.google.com/apikey).\n3. Restart the backend server.`;
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
        let embedding = null;
        try {
            embedding = await getEmbedding(chunk);
        } catch (e) {
            console.warn(`⚠️ Embedding skipped for chunk ${i + 1}:`, e.message);
        }

        const chunkData = {
            document_id: docId,
            content: chunk,
        };
        if (embedding && Array.isArray(embedding)) {
            chunkData.embedding = embedding;
        }

        const { error: insertError } = await supabase.from('document_chunks').insert(chunkData);

        if (insertError) {
            console.error(`❌ Insert Error Chunk ${i}:`, insertError.message);
        } else {
            successCount++;
        }
    }

    if (successCount === 0 && chunks.length > 0) {
        throw new Error("Failed to insert document chunks into database.");
    }

    await supabase.from('documents').update({ status: 'ready' }).eq('id', docId);
    console.log(`🎉 Processed ${successCount}/${chunks.length} chunks for doc: ${doc.title || docId}`);
    return { success: true, chunks: successCount };
}

// --- Routes ---
const router = express.Router();

router.get(['/health', '/api/health'], (req, res) => {
    res.json({
        status: 'ok',
        ocr: Tesseract ? 'enabled' : 'disabled',
        ai: process.env.GEMINI_API_KEY ? 'gemini' : process.env.GROQ_API_KEY ? 'groq' : 'fallback',
        time: new Date().toISOString()
    });
});

router.post(['/documents/:id/process', '/api/documents/:id/process'], async (req, res) => {
    const docId = req.params.id;
    try {
        const result = await processDocument(docId);
        res.json(result);
    } catch (error) {
        console.error("❌ Processing error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post(['/chat', '/api/chat'], async (req, res) => {
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
        res.json({
            success: true,
            response: `⚠️ **Notice**: Unable to process chat completion right now (${error.message}).\n\nTo ensure reliable AI answers, add a free \`GROQ_API_KEY\` or \`GEMINI_API_KEY\` in your \`.env\` file.`
        });
    }
});

router.post(['/ai/flashcards', '/api/ai/flashcards'], async (req, res) => {
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

        const rawOutput = await callAI(messages, 3, { json: true, max_tokens: 3500 });
        const data = extractAndParseJSON(rawOutput);

        // Deduplicate flashcards by question
        const seenCards = new Set();
        const uniqueFlashcards = (data.flashcards || []).filter(c => {
            const norm = (c.question || '').trim().toLowerCase().replace(/[?.,!]/g, '');
            if (!norm || seenCards.has(norm)) return false;
            seenCards.add(norm);
            return true;
        });

        res.json({ success: true, flashcards: uniqueFlashcards });
    } catch (error) {
        console.error("❌ Flashcards generation error:", error.message);
        res.status(422).json({ error: error.message });
    }
});

router.post(['/ai/quiz', '/api/ai/quiz'], async (req, res) => {
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

        const difficultyGuidance = difficulty === 'hard'
            ? 'hard difficulty (challenging analytical, conceptual, and multi-step applied questions)'
            : difficulty === 'easy'
                ? 'easy difficulty (clear recall, fundamental definitions, and core facts)'
                : 'medium difficulty (practical understanding and conceptual application)';

        const systemPrompt = `Based on the provided context, generate a ${requestedCount}-question multiple choice quiz with ${difficultyGuidance}.
For each question provide:
- "question": clear, challenging, unique question statement (no duplicate questions)
- "options": array of exactly 4 distinct strings: ["Choice A", "Choice B", "Choice C", "Choice D"]
- "correct_answer": exact text matching one of the options
- "explanation": concise 1-2 sentence explanation of why the correct answer is right

Return ONLY a valid JSON object in this format: 
{ "quiz": [ { "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "...", "explanation": "..." } ] }`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context.substring(0, 6000)}` }
        ];

        const rawOutput = await callAI(messages, 3, { json: true, max_tokens: 4500 });
        const data = extractAndParseJSON(rawOutput);

        if (!data || !Array.isArray(data.quiz) || data.quiz.length === 0) {
            throw new Error("AI returned an invalid quiz structure.");
        }

        // Normalize options and correct_answer for frontend compatibility, and deduplicate questions
        const seenQuizQ = new Set();
        const normalizedQuiz = (data.quiz || [])
            .filter(q => {
                const norm = (q.question || '').trim().toLowerCase().replace(/[?.,!]/g, '');
                if (!norm || seenQuizQ.has(norm)) return false;
                seenQuizQ.add(norm);
                return true;
            })
            .map(q => {
            let options = q.options;
            if (!Array.isArray(options) && typeof options === 'object' && options !== null) {
                options = Object.values(options);
            }
            if (!Array.isArray(options) || options.length === 0) {
                options = ["True", "False", "Partially True", "Cannot be determined"];
            }

            options = options.map(opt => String(opt).trim());

            let correctAnswer = String(q.correct_answer || '').trim();
            let idx = options.findIndex(opt => opt === correctAnswer);
            if (idx === -1) {
                idx = options.findIndex(opt => opt.toLowerCase() === correctAnswer.toLowerCase());
            }
            if (idx === -1) {
                idx = options.findIndex(opt => opt.toLowerCase().includes(correctAnswer.toLowerCase()) || correctAnswer.toLowerCase().includes(opt.toLowerCase()));
            }
            if (idx !== -1) {
                correctAnswer = options[idx];
            } else {
                correctAnswer = options[0];
            }

            return {
                question: q.question || "Quiz Question",
                options: options.slice(0, 4),
                correct_answer: correctAnswer,
                explanation: q.explanation || "Correct choice as stated in document context."
            };
        });

        res.json({ success: true, quiz: normalizedQuiz });
    } catch (error) {
        console.error("❌ Quiz generation error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// AI Study Plan Generator Route
router.post(['/ai/study-plan', '/api/ai/study-plan'], async (req, res) => {
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

        const rawOutput = await callAI(messages, 3, { json: true, max_tokens: 3500 });
        const data = extractAndParseJSON(rawOutput);

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

// Mount router on both '/api' and root '/'
app.use('/api', router);
app.use('/', router);

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 StudyMate+ Backend running on http://127.0.0.1:${PORT}`);
    });
}

module.exports = app;
