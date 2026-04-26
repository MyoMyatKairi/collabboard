import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Layout, Plus, Users, ArrowRight, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { RoomSummary } from "../types";

interface LandingProps {
  session: any;
}

export default function Landing({ session }: LandingProps) {
  const [profile, setProfile] = useState<any>(null);
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function getProfile() {
      if (!supabase || !session?.user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
      }

      const { data: roomsData, error: roomsError } = await supabase
        .from("boards")
        .select("id, title, room_code, active_users_count, updated_at, created_at")
        .eq("owner_id", session.user.id)
        .order("updated_at", { ascending: false });

      const { data: participantRows, error: participantError } = await supabase
        .from("participants")
        .select("boards(id, title, room_code, active_users_count, updated_at, created_at)")
        .eq("user_id", session.user.id);

      if (roomsError) {
        console.error("Error fetching rooms:", roomsError);
      } else {
        const joinedRooms = (participantRows || [])
          .map((row: any) => row.boards)
          .filter(Boolean) as RoomSummary[];
        if (participantError) {
          console.error("Error fetching joined rooms:", participantError);
        }

        const merged = [...(roomsData || []), ...joinedRooms];
        const unique = new Map<string, RoomSummary>();
        merged.forEach((room) => unique.set(room.id, room));
        const withPresence = await Promise.all(
          Array.from(unique.values()).map(async (room) => {
            const cutoff = new Date(Date.now() - 45000).toISOString();
            const { count } = await supabase
              .from("board_presence")
              .select("user_id", { count: "exact", head: true })
              .eq("board_id", room.id)
              .gte("last_seen", cutoff);
            return { ...room, active_users_count: count || 0 };
          })
        );

        const sorted = withPresence.sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        });
        setRooms(sorted.slice(0, 10));
      }
      setLoading(false);
    }

    getProfile();
  }, [session]);

  const handleCreateRoom = async () => {
    if (!supabase || !session?.user) {
      toast.error("Supabase is not configured");
      return;
    }

    setCreatingRoom(true);
    try {
      const defaultTitle = `${profile?.full_name || "Untitled"}'s board`;
      const { data, error } = await supabase
        .from("boards")
        .insert({
          title: defaultTitle,
          owner_id: session.user.id,
          is_private: false,
        })
        .select("id, title, room_code, active_users_count, updated_at, created_at")
        .single();

      if (error) throw error;
      if (!data?.room_code) throw new Error("Failed to create room code");

      setRooms((prev) => [data, ...prev.filter((room) => room.id !== data.id)].slice(0, 10));
      navigate(`/room/${data.room_code}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return toast.error("Please enter a room ID");
    if (!supabase) return toast.error("Supabase is not configured");

    const code = roomId.trim();
    const { data, error } = await supabase
      .from("boards")
      .select("room_code")
      .eq("room_code", code)
      .maybeSingle();

    if (error) return toast.error(error.message || "Failed to find room");
    if (!data) return toast.error("Room not found");

    navigate(`/room/${code}`);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success("Signed out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-slate-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 toolbar-shadow border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
              <Layout size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">CollabBoard</h1>
              <p className="text-slate-500 text-xs md:text-sm">Real-time collaboration</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Welcome back</p>
              <p className="font-bold text-slate-900 truncate">
                {profile?.full_name || profile?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-4 md:my-6" />

          <div className="grid gap-3 md:gap-4">
            <button
              onClick={handleCreateRoom}
              disabled={creatingRoom}
              className="w-full flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold transition-all group shadow-lg shadow-blue-100 text-sm md:text-base"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <Plus size={18} className="md:w-5 md:h-5" />
                <span>{creatingRoom ? "Creating..." : "Create New Room"}</span>
              </div>
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all md:w-[18px] md:h-[18px]" />
            </button>

            <div className="relative flex items-center py-1 md:py-2">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 md:mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">or join existing</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-2 md:space-y-3">
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 md:w-[18px] md:h-[18px]" size={16} />
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm md:text-base"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 md:py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold transition-all text-sm md:text-base"
              >
                Join Room
              </button>
            </form>

            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Rooms</p>
              <div className="space-y-2 max-h-44 overflow-auto pr-1">
                {rooms.length === 0 ? (
                  <p className="text-xs text-slate-500">No saved rooms yet.</p>
                ) : (
                  rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => navigate(`/room/${room.room_code}`)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                    >
                      <p className="text-sm font-semibold text-slate-900 truncate">{room.title || "Untitled Room"}</p>
                      <p className="text-[11px] text-slate-500">
                        Code: <span className="font-mono">{room.room_code}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Online: {room.active_users_count ?? 0}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 md:mt-8 text-center text-slate-400 text-[10px]">
          CollaBoard@2026
        </p>
      </motion.div>
    </div>
  );
}
