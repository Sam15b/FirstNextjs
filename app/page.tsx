"use client"

import type React from "react"

import { useState, useEffect, useRef, type KeyboardEvent } from "react"
import {
  UserButton,
  useUser
} from '@clerk/nextjs'
import Sidebar from "@/components/Sidebar"; // Adjust path if needed
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
  Edit3,
  Library,
  Sparkles,
  X,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { env } from "process";

type Message = {
  role: "user" | "assistant"
  content: string
  isLoading?: boolean
  isImage?: boolean
  imageUrl?: string
}

type ChatHistory = {
  title: string;
  messages: Message[]
};

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { isSignedIn, user, isLoaded } = useUser();
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [dbUser, setDbUser] = useState<any>(null);
  const [shouldSaveToDB, setShouldSaveToDB] = useState(false);
  const replyRef = useRef<{ title?: string; index?: number }>({});
  const titleRef = useRef<string | undefined>(undefined);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>("");

  const handleSave = async (oldTitle: string, newTitle: string) => {
    if (newTitle.trim() && newTitle !== oldTitle) {
      const email = dbUser.email
      try {
        const response = await fetch("/api/user/titleupdate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Title: oldTitle, newTitle, email }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("Title updated successfully:", result);
          if (titleRef.current == oldTitle) {
            titleRef.current = newTitle
          }
          if (result.data.chats) {
            const chats = Object.entries(result.data.chats).map(([title, messages]) => ({
              title,
              messages: messages as Message[],
            }));
            console.log("Checking chats", chats)
            setChatHistory(chats);
          }
        } else {
          console.error("Failed to update title:", result.message || result.error || result);
        }

      } catch (error) {
        console.error("Error while updating title:", error);
      }
    }
    setEditingId(null);
  };

  const Deleteobj = async (Title: String) => {
    if (Title) {
      const email = dbUser.email
      try {
        const response = await fetch("/api/user/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Title, email }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("Title Deleted successfully:", result);
          if (titleRef.current == Title) {
            titleRef.current = undefined
            setIsConversationStarted(false)
          }
          if (result.data.chats) {
            const chats = Object.entries(result.data.chats).map(([title, messages]) => ({
              title,
              messages: messages as Message[],
            }));
            console.log("Checking chats", chats)
            setChatHistory(chats);
          }
        } else {
          console.error("Failed to update title:", result.message || result.error || result);
        }
      } catch (error) {
        console.error("Error while updating title:", error);
      }
    }
  }

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
      setEditingId(null);
    };
    //window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoaded || !isSignedIn || !user) return;

      const fullName = user.fullName;
      const email = user.emailAddresses[0]?.emailAddress;

      try {
        const res = await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email }),
        });

        const result = await res.json();
        console.log('DB User:', result);
        setDbUser(result);

        if (result.chats) {
          const chats = Object.entries(result.chats).map(([title, messages]) => ({
            title,
            messages: messages as Message[],
          }));
          console.log("Checking chats", chats)
          setChatHistory(chats);

        }
      } catch (error) {
        console.error('Failed to sync user', error);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    const saveToDB = async () => {
      console.log("replyRef.current.title", replyRef.current.title)
      if (shouldSaveToDB && replyRef.current.title && replyRef.current.index !== undefined) {
        await SendMessageToDB(replyRef.current.title, replyRef.current.index, dbUser.email);
        setShouldSaveToDB(false); 
      }
    };

    saveToDB();
  }, [shouldSaveToDB]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setActiveMenuId(null);
    };

    window.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);



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

  const SendMessageToDB = async (
    Title: string,
    val: number,
    email: string
  ): Promise<void> => {
    console.log("Title:", Title);
    console.log("Messages:", messages);
    console.log("Val:", val);
    console.log("Email:", email)

    try {
      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Title, messages, check: val === 1 ? true : false, email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save message");
      }

      console.log("Message saved successfully:", data);
      if (val === 1) {
        if (data.chats) {
          const chats = Object.entries(data.chats).map(([title, messages]) => ({
            title,
            messages: messages as Message[],
          }));
          console.log("Updated chat history:", chats);
          setChatHistory(chats);

        }
      }
    } catch (err) {
      console.error("Error saving message:", err);
    }

  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return

    
    const userMessage: Message = {
      role: "user",
      content: inputValue,
      ...(selectedImage && {
        isImage: true,
        imageUrl: selectedImage,
      }),
    }

    
    setMessages((prevMessages) => [...prevMessages, userMessage])

    let i: number = 0;

    if (!isConversationStarted) {
      i = 1;
      if (!titleRef.current) {
        titleRef.current = inputValue; 
      }
    }

    setIsConversationStarted(true)

    setSelectedType(null);

    const userInput = inputValue
    setInputValue("")

    const loadingMessage: Message = {
      role: "assistant",
      content: "...",
      isLoading: true,
    }

    setMessages((prevMessages) => [...prevMessages, loadingMessage])

    console.log("messages", messages)
    console.log("Check Db user", dbUser.email)
    try {

      if (selectedImage) {
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
        replyRef.current = {
          title: titleRef.current,
          index: i,
        };

        setShouldSaveToDB(true);
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput, 
          type: selectedType,
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
      replyRef.current = {
        title: titleRef.current,
        index: i,
      };

      
      setShouldSaveToDB(true);
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

  if (!dbUser) return;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chatHistory={chatHistory}
        setMessages={setMessages}
        setIsConversationStarted={setIsConversationStarted}
        titleRef={titleRef}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        editingId={editingId}
        setEditingId={setEditingId}
        editedTitle={editedTitle}
        setEditedTitle={setEditedTitle}
        handleSave={handleSave}
        Deleteobj={Deleteobj}
      />

      <header className="border-b border-gray-200 px-4 py-2">
        <div className="w-full px-0">
          <div className="flex items-center justify-between gap-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative group">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md border-gray-200" onClick={() => setIsSidebarOpen(true)}>
                  <PanelLeftOpen className="h-5 w-5 text-gray-500" />
                </Button>
                <div
                  className="absolute left-[83%] -translate-x-1/2 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 whitespace-nowrap">
                  Open Sidebar
                </div>
              </div>
              <div className="relative group">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md border-gray-200" onClick={() => { setMessages([]); setIsConversationStarted(false); titleRef.current = undefined; }}>
                  <SquarePen className="h-5 w-5 text-gray-500" />
                </Button>
                <div className="absolute left-1/2 sm:left-[83%] -translate-x-1/2 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 whitespace-nowrap">
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

                <UserButton />
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
        ChatGPT can make mistakes. Check important info. See Cookie Preferences {process.env.DATABASE_URL}
      </footer>
    </div>
  )
}
