"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

/** 获取当前登录用户，未登录为 null；会随登录/登出更新 */
export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const get = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
      setLoading(false);
    };
    get();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      get();
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
