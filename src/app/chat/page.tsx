import type { Metadata } from "next";
import { ChatRoute } from "@/components/chat/chat-route";

export const metadata: Metadata = {
  title: "Your conversations | ChatApp",
  description: "Private, real-time conversations with your people.",
};

export default function ChatPage() {
  return <ChatRoute />;
}
