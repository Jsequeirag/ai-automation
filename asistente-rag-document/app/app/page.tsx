import { Documents } from "./documents";
import { Workspace } from "./workspace";

export default function AppHome() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <Workspace>
        <Documents />
      </Workspace>
    </main>
  );
}
