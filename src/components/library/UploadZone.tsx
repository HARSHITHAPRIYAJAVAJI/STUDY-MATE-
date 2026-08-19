import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Upload, FileText, Sparkles, Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UploadZoneProps {
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    dragActive: boolean;
    onDrag: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    selectedLanguage?: string;
    onLanguageChange?: (value: string) => void;
}

export default function UploadZone({
    onFileSelect,
    dragActive,
    onDrag,
    onDrop,
    fileInputRef,
    selectedLanguage = "english",
    onLanguageChange
}: UploadZoneProps) {
    return (
        <Card className={`relative z-30 overflow-visible bg-white/90 backdrop-blur-md shadow-md rounded-2xl border-2 border-dashed transition-all duration-300 ${
            dragActive 
                ? 'border-[#603DD9] bg-[#603DD9]/5 scale-[1.01]' 
                : 'border-purple-200/80 hover:border-[#603DD9]/50 hover:bg-purple-50/20'
        }`}>
            <CardContent
                className="p-6 sm:p-7 overflow-visible"
                onDragEnter={onDrag}
                onDragLeave={onDrag}
                onDragOver={onDrag}
                onDrop={onDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={onFileSelect}
                    className="hidden"
                />

                <div className="flex flex-col items-center text-center space-y-4 max-w-xl mx-auto">
                    {/* Compact Icon */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-md shadow-[#603DD9]/20">
                        <Upload className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                            Upload Study Materials
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md font-medium">
                            Drag & drop PDF or images here, or browse files for automatic AI summary and study extraction.
                        </p>
                    </div>

                    {/* Compact Horizontal Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-[#603DD9]/20 text-xs sm:text-sm"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Browse Files
                        </Button>

                        {/* Language Selection */}
                        <div className="flex items-center gap-1.5">
                            <Languages className="w-4 h-4 text-slate-400" />
                            <div className="w-36">
                                <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                                    <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white font-semibold">
                                        <SelectValue placeholder="Language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="english">English</SelectItem>
                                        <SelectItem value="spanish">Spanish</SelectItem>
                                        <SelectItem value="french">French</SelectItem>
                                        <SelectItem value="german">German</SelectItem>
                                        <SelectItem value="italian">Italian</SelectItem>
                                        <SelectItem value="portuguese">Portuguese</SelectItem>
                                        <SelectItem value="chinese">Chinese</SelectItem>
                                        <SelectItem value="japanese">Japanese</SelectItem>
                                        <SelectItem value="korean">Korean</SelectItem>
                                        <SelectItem value="arabic">Arabic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#9E4CEC]" />
                        <span>PDF, JPG, PNG, WEBP • Up to 10MB</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
