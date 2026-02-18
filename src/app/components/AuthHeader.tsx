import { createClient } from "@/utils/supabase/server";

export default async function AuthHeader() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="sticky top-0 left-0 right-0 z-50 flex items-center justify-end gap-3 px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
      <span className="text-sm text-gray-400 truncate max-w-[180px]" title={user.email ?? undefined}>
        {user.email}
      </span>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="text-sm text-gray-400 hover:text-rose-400 transition px-2 py-1 rounded hover:bg-white/5"
        >
          退出
        </button>
      </form>
    </header>
  );
}
