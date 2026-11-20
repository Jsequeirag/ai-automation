import { Documents } from "./documents";
import { Chat } from "./chat";

export default function AppHome() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4">
      <Documents />
      <Chat />
    </main>
  );
}
