import React from "react";
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"; 
import { PanelLeftOpen, SquarePen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";


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

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatHistory[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsConversationStarted: React.Dispatch<React.SetStateAction<boolean>>;
  titleRef: React.RefObject<string | undefined>;
  activeMenuId: string | null;
  setActiveMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  editedTitle: string;
  setEditedTitle: React.Dispatch<React.SetStateAction<string>>;
  handleSave: (oldTitle: string, newTitle: string) => Promise<void>;
  Deleteobj: (Title: string) => Promise<void>;
};

const Sidebar = ({
  isOpen,
  onClose,
  chatHistory,
  setMessages,
  setIsConversationStarted,
  titleRef,
  activeMenuId,
  setActiveMenuId,
  editingId,
  setEditingId,
  editedTitle,
  setEditedTitle,
  handleSave,
  Deleteobj
}: SidebarProps) => {


  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`
        fixed top-0 left-0 h-full w-80 bg-gray-50 border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <img src="/assets/openai2-removebg-preview.png" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <span className="font-medium text-gray-900">ChatGPT</span>
            </div>

            <div className="relative group">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-md bg-gray-50 border-gray-200" onClick={onClose}>
                <PanelLeftOpen className="h-5 w-5 text-gray-500 transform rotate-180" />
              </Button>
              <div
                className="absolute left-[83%] -translate-x-1/2 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 whitespace-nowrap">
                Close Sidebar
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-3 border-b border-gray-200">
            <Button variant="ghost" className="w-full justify-start gap-3 mb-2 text-gray-700 hover:bg-gray-100" onClick={() => { setMessages([]); setIsConversationStarted(false); titleRef.current = undefined; onClose(); }}>
              <SquarePen className="h-4 w-4" />
              <span>New chat</span>
            </Button>

          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {[...chatHistory].reverse().map((chat) => (
              <div key={chat.title} className="relative group">

                <Button
                  variant="ghost"
                  className="w-full justify-between text-left p-2 h-auto mb-1 text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    // onSelect(chat);
                    if (editingId !== chat.title) {
                      setMessages(chat.messages);
                      setIsConversationStarted(true);
                      titleRef.current = chat.title;
                      onClose();
                    }
                  }}
                >
                  <div className="truncate w-full">
                    {editingId === chat.title ? (
                      <input
                        autoFocus
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={() => handleSave(chat.title, editedTitle)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(chat.title, editedTitle);
                        }}
                        className="text-sm font-medium w-full p-1 border rounded"
                      />
                    ) : (
                      <div className="font-medium text-sm truncate">{chat.title}</div>
                    )}
                  </div>

                  {/* 3-dot icon (visible on hover) */}
                  <div
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation(); 
                      setActiveMenuId((prev) => (prev === chat.title ? null : chat.title));
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4 cursor-pointer" />
                  </div>
                </Button>

                {/* Popover Menu */}
                {activeMenuId === chat.title && (
                  <div
                    className="absolute right-3 top-full mt-1 w-36 bg-white shadow-lg border rounded-lg z-50"
                  >
                    <ul className="text-sm">
                      <li
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(chat.title);
                          setEditedTitle(chat.title);
                          setActiveMenuId(null);
                        }}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Rename
                      </li>
                      <li
                        onClick={(e) => {
                          e.stopPropagation();
                          // handleRename(chat)
                          Deleteobj(chat.title)
                          setActiveMenuId(null);
                        }}
                        className="px-4 py-2 hover:bg-red-50 cursor-pointer text-red-500 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar;