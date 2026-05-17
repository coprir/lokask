import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { prisma } from "@/lib/prisma";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const persona = await prisma.aiPersona.findFirst({
    where: { slug: "maya", isActive: true },
  });

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Maya is not available right now. Check back soon.
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });

  return (
    <ChatInterface
      persona={persona as never}
      user={user as never}
      subscription={user?.subscription as never}
    />
  );
}
