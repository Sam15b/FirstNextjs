"use client"

import type React from "react"

import { useState, useRef, type KeyboardEvent } from "react"
import {
  Plus,
  Globe,
  SquarePen,
  PanelLeftOpen,
  Lightbulb,
  Search,
  ImageIcon,
  MoreHorizontal,
  Mic,
  Clipboard,
  Pencil,
  ChevronDown,
  Info,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Share2,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type Message = {
  role: "user" | "assistant"
  content: string
  isLoading?: boolean
  isImage?: boolean
  imageUrl?: string
}

// Simple markdown renderer component
const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split("\n");

  let inCodeBlock = false;
  let processedLines: string[] = [];

  for (let line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock; // toggle code block state

      if (inCodeBlock) {
        // Start code block
        processedLines.push('<pre style="background:Gray;color:#ffff;padding:0 7%;border-radius: 8px;"><code>');
      } else {
        // End code block
        processedLines.push("</code></pre>");
      }
      continue; // don't process this line further
    }

    if (inCodeBlock) {
      // Escape HTML special chars in code blocks for safety
      const escapedCode = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      processedLines.push(escapedCode);
    } else {
      // Process bold (**text**)
      let processed = line.replace(/\*\*(.+?)\*\*/g, (_, text) => `<span class="font-bold">${text}</span>`);

      // Process italic (*text*)
      processed = processed.replace(/\*(.+?)\*/g, (_, text) => `<span class="italic">${text}</span>`);

      // Replace spaces with &nbsp; if you want to preserve indentation in normal text (optional)

      processedLines.push(processed);
    }
  }

  const processedContent = processedLines.join("<br />");

  return (
    <div
      className="text-gray-800"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
};


export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isConversationStarted, setIsConversationStarted] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<"search" | "reason" | "deep_research" | "create_image" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setSelectedImage(url)
    }
  }

  const handleSelect = (typeee: "search" | "reason" | "deep_research" | "create_image") => {
    setSelectedType(prev => {
      const newValue = typeee === prev ? null : typeee;
      console.log("New Selected Type:", newValue);
      return newValue;
    });
  };
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      sendMessage()
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: inputValue,
      ...(selectedImage && {
        isImage: true,
        imageUrl: selectedImage,
      }),
    }

    // Update messages with user message and set loading state
    setMessages((prevMessages) => [...prevMessages, userMessage])
    setIsConversationStarted(true)

    setSelectedType(null);

    // Store input value before clearing it
    const userInput = inputValue
    setInputValue("")

    // Set loading state
    const loadingMessage: Message = {
      role: "assistant",
      content: "...",
      isLoading: true,
    }

    setMessages((prevMessages) => [...prevMessages, loadingMessage])

    try {

      if (selectedImage) {
        // Clear selected image after sending
        setSelectedImage(null);

        const base64Data = await fetch(selectedImage)
          .then(res => res.blob())
          .then(
            blob =>
              new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () =>
                  resolve({
                    base64: (reader.result as string).split(",")[1], // remove data:*/*;base64,
                    mimeType: blob.type,
                  });
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              })
          );

        // Send to your new endpoint
        const response = await fetch("/api/chat/image-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userInput,
            imageBase64: base64Data.base64,
            mimeType: base64Data.mimeType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        const data = await response.json();
        console.log(data)

        setMessages((prevMessages) =>
          prevMessages.map((msg, i) => {
            if (i === prevMessages.length - 1) {
              if (data.image && data.reply) {
                // If both image and reply
                return {
                  role: "assistant",
                  content: data.reply,
                  isImage: true,
                  imageUrl: data.image,
                };
              } else if (data.image) {
                // Only image
                return {
                  role: "assistant",
                  content: "",
                  isImage: true,
                  imageUrl: data.image,
                };
              } else {
                // Only text
                return {
                  role: "assistant",
                  content: data.reply,
                };
              }
            }
            return msg;
          })
        );
        return;
      }

      // Call the API with the correct parameters for Gemini
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput, // Using 'message' instead of 'prompt' to match the API
          type: selectedType, // Default type
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response")
      }

      const data = await response.json()

      // Replace the loading message with the actual message(s)
      setMessages((prevMessages) =>
        prevMessages.map((msg, i) => {
          if (i === prevMessages.length - 1) {
            if (data.image && data.reply) {
              // If both image and reply
              return {
                role: "assistant",
                content: data.reply,
                isImage: true,
                imageUrl: data.image,
              };
            } else if (data.image) {
              // Only image
              return {
                role: "assistant",
                content: "",
                isImage: true,
                imageUrl: data.image,
              };
            } else {
              // Only text
              return {
                role: "assistant",
                content: data.reply,
              };
            }
          }
          return msg;
        })
      );
    } catch (error) {
      console.error("Error calling API:", error)
      setApiError(error instanceof Error ? error.message : "Unknown error occurred")

      // Replace loading message with error message
      setMessages((prevMessages) =>
        prevMessages.map((msg, i) =>
          i === prevMessages.length - 1
            ? { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
            : msg,
        ),
      )
    }
  }

  const handleSpecialRequest = async (type: "reason" | "deep_research" | "create_image") => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: inputValue,
    }

    // Update messages with user message and set loading state
    setMessages((prevMessages) => [...prevMessages, userMessage])
    setIsConversationStarted(true)

    // Store input value before clearing it
    const userInput = inputValue
    setInputValue("")

    // Set loading state
    const loadingMessage: Message = {
      role: "assistant",
      content: "...",
      isLoading: true,
    }

    setMessages((prevMessages) => [...prevMessages, loadingMessage])

    try {
      // Call the API with the correct parameters for Gemini
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput, // Using 'message' instead of 'prompt' to match the API
          type: type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response")
      }

      const data = await response.json()

      // Handle image response differently
      if (type === "create_image" && data.imageUrl) {
        setMessages((prevMessages) =>
          prevMessages.map((msg, i) =>
            i === prevMessages.length - 1
              ? {
                role: "assistant",
                content: `![Generated Image](${data.imageUrl})`,
                isImage: true,
                imageUrl: data.imageUrl,
              }
              : msg,
          ),
        )
      } else {
        // Replace loading message with actual response
        setMessages((prevMessages) =>
          prevMessages.map((msg, i) =>
            i === prevMessages.length - 1 ? { role: "assistant", content: data.reply } : msg,
          ),
        )
      }
    } catch (error) {
      console.error("Error calling API:", error)
      setApiError(error instanceof Error ? error.message : "Unknown error occurred")

      // Replace loading message with error message
      setMessages((prevMessages) =>
        prevMessages.map((msg, i) =>
          i === prevMessages.length - 1
            ? { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
            : msg,
        ),
      )
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-2">
        <div className="w-full px-0">
          <div className="flex items-center justify-between gap-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative group">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md border-gray-200">
                  <PanelLeftOpen className="h-5 w-5 text-gray-500" />
                </Button>
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 whitespace-nowrap">
                  Open Sidebar
                </div>
              </div>
              <div className="relative group">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md border-gray-200">
                  <SquarePen className="h-5 w-5 text-gray-500" />
                </Button>
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 whitespace-nowrap">
                  New chat
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm sm:text-base">ChatGPT</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">

              {isConversationStarted ? (
                <Button variant="outline" className="rounded-full border-gray-200 flex items-center gap-1.5 px-3 py-1 text-sm sm:text-base">
                  <Share2 className="h-4 w-4 text-gray-500" />
                  <span>Share</span>
                </Button>
              ) : (
                <Button variant="outline" className="rounded-full border-gray-200 flex items-center gap-1.5 px-3 py-1 text-sm sm:text-base">
                  <RotateCcw className="h-4 w-4 text-gray-500" />
                  <span>Temporary</span>
                </Button>
              )}
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                <img src="/assets/unnamed.jpg" alt="User Avatar" className="h-full w-full object-cover rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* API Error Alert */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mx-auto my-2 max-w-3xl">
          <p className="font-medium">API Error</p>
          <p className="text-sm">{apiError}</p>
          <button className="text-sm underline mt-1" onClick={() => setApiError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {!isConversationStarted ? (
          // Initial state - centered heading and input at bottom
          <>
            {/* <div className="flex-1 flex items-center justify-center">
              <h1 className="text-3xl font-semibold text-gray-800">What can I help with?</h1>
            </div> */}
            <h1 className="text-3xl text-gray-800 mb-8">What can I help with?</h1>
            <div className="w-full max-w-3xl mx-auto">
              <div className="relative rounded-2xl border border-gray-200 shadow-sm">
                <div className="px-4 py-3 min-h-[56px] flex items-center">
                  {selectedImage && (
                    <div className="relative group w-10 h-10 mr-2.5">
                      <img
                        src={selectedImage}
                        alt="Selected"
                        className="w-10 h-10 rounded object-cover border"
                      />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-[-8px] right-[-8px] bg-white text-red-500 rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask anything"
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                {/* Bottom Toolbar */}
                <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap items-center justify-between gap-y-2">
                  {/* Left Section */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-full sm:max-w-[80%] scrollbar-hide">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full flex-shrink-0"
                      onClick={handleButtonClick}
                    >
                      <Plus className="h-4 w-4 text-gray-500" />
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleSelect("reason")}
                      className={`h-8 rounded-md text-sm flex items-center gap-1.5 flex-shrink-0 ${selectedType === "reason" ? "text-blue-500" : "text-gray-600"
                        }`}
                    >
                      <Lightbulb className="h-4 w-4" />
                      <span className="whitespace-nowrap">Reason</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleSelect("deep_research")}
                      className={`h-8 rounded-md text-sm flex items-center gap-1.5 flex-shrink-0 ${selectedType === "deep_research" ? "text-blue-500" : "text-gray-600"
                        }`}
                    >
                      <Search className="h-4 w-4" />
                      <span className="whitespace-nowrap">Deep research</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleSelect("create_image")}
                      className={`h-8 rounded-md text-sm flex items-center gap-1.5 flex-shrink-0 ${selectedType === "create_image" ? "text-blue-500" : "text-gray-600"
                        }`}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="whitespace-nowrap">Create image</span>
                    </Button>
                  </div>

                  {/* Right Section */}
                  <div className="flex items-center gap-2 hidden sm:flex">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Mic className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          // Conversation state - messages and input at bottom
          <>
            <div className="flex-1 max-w-3xl w-full mx-auto mb-24">
              {messages.map((message, index) => (
                <div key={index} className="mb-6">
                  {message.role === "user" ? (
                    <div className="flex justify-end mb-6">
                      <div className="flex flex-col items-end max-w-[55%]">
                        <div className="bg-gray-100 rounded-lg px-4 py-3 w-full flex flex-col items-end">
                          {message.isImage && message.imageUrl && (
                            <img
                              src={message.imageUrl}
                              alt="Selected"
                              className="rounded object-cover mb-2 border"
                              style={{ maxHeight: '200px', width: 'auto' }}
                            />
                          )}
                          <p className="text-gray-800 text-right break-words">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="bg-white rounded-lg">
                        {message.isLoading ? (
                          <p className="text-gray-800">
                            <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-pulse mr-1"></span>
                            <span
                              className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-pulse mx-1"
                              style={{ animationDelay: "0.2s" }}
                            ></span>
                            <span
                              className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-pulse ml-1"
                              style={{ animationDelay: "0.4s" }}
                            ></span>
                          </p>
                        ) : message.isImage ? (
                          <div>
                            <p className="text-gray-800 mb-2">{message.content}</p>
                            <img
                              src={message.imageUrl || "/placeholder.svg?height=512&width=512"}
                              alt="Generated image"
                              className="rounded-lg max-w-full h-auto"
                            />
                          </div>
                        ) : (
                          <MarkdownRenderer content={message.content} />
                        )}
                        <div className="flex items-center gap-1 mt-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <Copy className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <ThumbsUp className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <ThumbsDown className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <Volume2 className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <Share2 className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Box - Fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
              <div className="w-full max-w-3xl mx-auto p-4">
                <div className="relative rounded-2xl border border-gray-200 shadow-sm">
                  <div className="px-4 py-3 min-h-[56px] flex items-center">
                    {selectedImage && (
                      <div className="relative group w-10 h-10 mr-2.5">
                        <img
                          src={selectedImage}
                          alt="Selected"
                          className="w-10 h-10 rounded object-cover border"
                        />
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="absolute top-[-8px] right-[-8px] bg-white text-red-500 rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Ask anything"
                      className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap items-center justify-between gap-y-2">
                  {/* Left Section */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-full sm:max-w-[80%] scrollbar-hide">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full flex-shrink-0"
                      onClick={handleButtonClick}
                    >
                      <Plus className="h-4 w-4 text-gray-500" />
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleSelect("reason")}
                      className={`h-8 rounded-md text-sm flex items-center gap-1.5 flex-shrink-0 ${selectedType === "reason" ? "text-blue-500" : "text-gray-600"
                        }`}
                    >
                      <Lightbulb className="h-4 w-4" />
                      <span className="whitespace-nowrap">Reason</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleSelect("deep_research")}
                      className={`h-8 rounded-md text-sm flex items-center gap-1.5 flex-shrink-0 ${selectedType === "deep_research" ? "text-blue-500" : "text-gray-600"
                        }`}
                    >
                      <Search className="h-4 w-4" />
                      <span className="whitespace-nowrap">Deep research</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleSelect("create_image")}
                      className={`h-8 rounded-md text-sm flex items-center gap-1.5 flex-shrink-0 ${selectedType === "create_image" ? "text-blue-500" : "text-gray-600"
                        }`}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="whitespace-nowrap">Create image</span>
                    </Button>
                  </div>

                  {/* Right Section */}
                  <div className="flex items-center gap-2 hidden sm:flex">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Mic className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="text-center text-xs text-gray-500 py-2 border-t border-gray-100">
        ChatGPT can make mistakes. Check important info. See Cookie Preferences
      </footer>
    </div>
  )
}
