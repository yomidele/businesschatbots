import { useParams } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";

const ChatWidget = () => {
  const { siteId } = useParams<{ siteId: string }>();

  return (
    <div className="h-screen w-screen bg-card">
      <ChatInterface siteId={siteId!} embedded />
    </div>
  );
};

export default ChatWidget;
