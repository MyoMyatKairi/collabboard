import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Stage, Layer, Line, Rect, Circle, Arrow, Text, Group, Transformer, Path } from "react-konva";
import { nanoid } from "nanoid";
import * as lucideReact from "lucide-react";
import { Element, ElementType, Participant, CursorPosition } from "../types";
import { jsPDF } from "jspdf";
import { motion } from "motion/react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const COLORS = ["#1A1A1A", "#EF4444", "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"];
const STROKE_WIDTHS = [2, 4, 8, 12];

interface WhiteboardProps {
  session: any;
}

interface BoardElementRow {
  id: string;
  board_id: string;
  type: string;
  data: any;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  z_index: number | null;
}

const mapElementTypeToDbType = (type: ElementType) => {
  if (type === "pen") return "stroke";
  if (type === "sticky") return "note";
  if (type === "text") return "text";
  return "shape";
};

const mapRowToElement = (row: BoardElementRow): Element | null => {
  if (row.data?.element) return row.data.element as Element;
  if (!row.data) return null;
  return {
    id: row.data.id || row.id,
    type: row.data.type,
    x: row.position_x || 0,
    y: row.position_y || 0,
    points: row.data.points,
    width: row.width || undefined,
    height: row.height || undefined,
    fill: row.data.fill,
    stroke: row.data.stroke,
    strokeWidth: row.data.strokeWidth,
    text: row.data.text,
    rotation: row.data.rotation,
  } as Element;
};

export default function Whiteboard({ session }: WhiteboardProps) {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  
  const userName = profile?.full_name || profile?.username || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || "Guest";
  
  const [elements, setElements] = useState<Element[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ElementType>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [dimensions, setDimensions] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 });
  const [isMobile, setIsMobile] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardOnlineCount, setBoardOnlineCount] = useState(0);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dirtyRef = useRef(false);
  const flushingRef = useRef(false);
  const elementsRef = useRef<Element[]>([]);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Fetch profile
  useEffect(() => {
    async function getProfile() {
      if (!supabase || !session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (data) setProfile(data);
    }
    getProfile();
  }, [session]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize Socket.io
  useEffect(() => {
    if (!roomId) return;

    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to socket server");
      setIsSocketConnected(true);
      socket.emit("join-room", {
        roomId,
        userId: session?.user?.id,
        userName:
          session?.user?.user_metadata?.full_name ||
          session?.user?.email?.split("@")[0] ||
          userName,
      });
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
      setParticipants([]);
    });

    socket.on("participants", (list: Array<{ id: string; name: string }>) => {
      const deduped = new Map<string, Participant>();
      const mySocketId = socket.id;
      (list || []).forEach((p) => {
        if (!p?.id) return;
        // Exclude myself whether server emits user id or socket id.
        if (p.id === session?.user?.id || p.id === mySocketId) return;
        deduped.set(p.id, { id: p.id, name: p.name || "Guest" });
      });
      setParticipants(Array.from(deduped.values()));
    });

    socket.on("draw", (element: Element) => {
      setElements((prev) => [...prev, element]);
      dirtyRef.current = true;
    });

    socket.on("update", ({ elementId, updates }: { elementId: string; updates: Partial<Element> }) => {
      setElements((prev) =>
        prev.map((el) => (el.id === elementId ? { ...el, ...updates } : el))
      );
      dirtyRef.current = true;
    });

    socket.on("delete", ({ elementId }: { elementId: string }) => {
      setElements((prev) => prev.filter((el) => el.id !== elementId));
      dirtyRef.current = true;
    });

    socket.on("clear", () => {
      setElements([]);
      dirtyRef.current = true;
    });

    socket.on("cursor", (cursor: CursorPosition) => {
      setCursors((prev) => ({ ...prev, [cursor.id]: cursor }));
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, session?.user?.id, session?.user?.email, session?.user?.user_metadata?.full_name, userName]);

  // Resolve board and hydrate saved elements
  useEffect(() => {
    async function loadBoard() {
      if (!supabase || !roomId) {
        setLoadingBoard(false);
        return;
      }

      setLoadingBoard(true);
      const { data: board, error: boardError } = await supabase
        .from("boards")
        .select("id, room_code, owner_id, active_users_count")
        .eq("room_code", roomId)
        .maybeSingle();

      if (boardError || !board) {
        toast.error("Room not found");
        navigate("/");
        setLoadingBoard(false);
        return;
      }

      const { error: participantError } = await supabase
        .from("participants")
        .upsert(
          {
            user_id: session?.user?.id,
            board_id: board.id,
            role: board.owner_id === session?.user?.id ? "owner" : "editor",
          },
          { onConflict: "user_id,board_id", ignoreDuplicates: true }
        );

      if (participantError) {
        toast.error(`Unable to join room: ${participantError.message}`);
        navigate("/");
        setLoadingBoard(false);
        return;
      }

      setBoardOnlineCount(board.active_users_count ?? 0);

      setBoardId(board.id);
      const { data: rows, error: elementError } = await supabase
        .from("board_elements")
        .select("id, board_id, type, data, position_x, position_y, width, height, z_index")
        .eq("board_id", board.id)
        .order("z_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (elementError) {
        toast.error("Failed to load saved board data");
      } else {
        const hydrated = (rows || [])
          .map((row) => mapRowToElement(row as BoardElementRow))
          .filter(Boolean) as Element[];
        setElements(hydrated);
      }
      setLoadingBoard(false);
    }

    loadBoard();
  }, [roomId, navigate, session?.user?.id]);

  // Board presence heartbeat (single row per user per board)
  useEffect(() => {
    if (!supabase || !boardId || !session?.user?.id) return;

    const upsertPresence = async () => {
      const { error } = await supabase
        .from("board_presence")
        .upsert(
          {
            board_id: boardId,
            user_id: session.user.id,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "board_id,user_id" }
        );
      if (error) {
        console.error("board_presence upsert failed:", error);
      }
    };

    const refreshOnlineCount = async () => {
      const cutoff = new Date(Date.now() - 45000).toISOString();
      const { count, error } = await supabase
        .from("board_presence")
        .select("user_id", { count: "exact", head: true })
        .eq("board_id", boardId)
        .gte("last_seen", cutoff);

      if (error) {
        console.error("board_presence count failed:", error);
        return;
      }
      setBoardOnlineCount(count || 0);
    };

    const init = async () => {
      await upsertPresence();
      await refreshOnlineCount();
    };
    void init();

    const heartbeat = window.setInterval(() => {
      void upsertPresence();
      void refreshOnlineCount();
    }, 15000);

    return () => {
      window.clearInterval(heartbeat);
      void supabase
        .from("board_presence")
        .delete()
        .eq("board_id", boardId)
        .eq("user_id", session.user.id);
    };
  }, [boardId, session?.user?.id]);

  const persistBoard = async (mode: "auto" | "manual" | "leave" = "auto") => {
    if (!supabase || !boardId) return;
    if (!dirtyRef.current || flushingRef.current) return;
    flushingRef.current = true;
    if (mode !== "auto") setIsSaving(true);

    const snapshot = [...elementsRef.current];
    const deleteResult = await supabase.from("board_elements").delete().eq("board_id", boardId);
    if (deleteResult.error) {
      toast.error(`Failed to save board changes: ${deleteResult.error.message}`);
      flushingRef.current = false;
      if (mode !== "auto") setIsSaving(false);
      return;
    }

    if (snapshot.length > 0) {
      const payload = snapshot.map((el, index) => ({
        board_id: boardId,
        created_by: session?.user?.id ?? null,
        type: mapElementTypeToDbType(el.type),
        data: { element: el },
        position_x: el.x,
        position_y: el.y,
        width: el.width ?? null,
        height: el.height ?? null,
        z_index: index,
      }));

      const insertResult = await supabase.from("board_elements").insert(payload);
      if (insertResult.error) {
        toast.error(`Failed to persist board elements: ${insertResult.error.message}`);
        console.error("board_elements insert failed:", insertResult.error);
        flushingRef.current = false;
        if (mode !== "auto") setIsSaving(false);
        return;
      }
    }

    await supabase.from("boards").update({ updated_at: new Date().toISOString() }).eq("id", boardId);
    dirtyRef.current = false;
    flushingRef.current = false;
    if (mode === "manual") toast.success("Board saved");
    if (mode !== "auto") setIsSaving(false);
  };

  // Autosave every 5 minutes
  useEffect(() => {
    if (!supabase || !boardId) return;
    const timer = window.setInterval(() => {
      void persistBoard("auto");
    }, 300000);
    return () => window.clearInterval(timer);
  }, [boardId, session?.user?.id]);

  // Save when leaving/unloading
  useEffect(() => {
    if (!boardId) return;
    const handleBeforeUnload = () => {
      if (supabase && session?.user?.id) {
        void supabase
          .from("board_presence")
          .delete()
          .eq("board_id", boardId)
          .eq("user_id", session.user.id);
      }
      void persistBoard("leave");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void persistBoard("leave");
    };
  }, [boardId, session?.user?.id, supabase]);

  const handleLeaveRoom = async () => {
    if (supabase && session?.user?.id && boardId) {
      await supabase
        .from("board_presence")
        .delete()
        .eq("board_id", boardId)
        .eq("user_id", session.user.id);
    }
    await persistBoard("leave");
    navigate("/");
  };

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  // Handle drawing
  const handleMouseDown = (e: any) => {
    if (editingId) return;

    if (tool === "mouse") {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    if (tool === "eraser") {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (!clickedOnEmpty) {
        const id = e.target.id() || e.target.getParent()?.id();
    if (id) {
      setElements((prev) => prev.filter((el) => el.id !== id));
      socketRef.current?.emit("delete", { roomId, elementId: id });
    }
      }
      return;
    }

    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const id = nanoid();

    let newElement: Element;

    if (tool === "pen") {
      newElement = {
        id,
        type: "pen",
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: color,
        strokeWidth,
      };
    } else if (tool === "rect") {
      newElement = {
        id,
        type: "rect",
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth,
      };
    } else if (tool === "circle") {
      newElement = {
        id,
        type: "circle",
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth,
      };
    } else if (tool === "arrow") {
      newElement = {
        id,
        type: "arrow",
        x: 0,
        y: 0,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: color,
        strokeWidth,
      };
    } else if (tool === "line") {
      newElement = {
        id,
        type: "line",
        x: 0,
        y: 0,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: color,
        strokeWidth,
      };
    } else if (tool === "sticky") {
      newElement = {
        id,
        type: "sticky",
        x: pos.x,
        y: pos.y,
        width: 150,
        height: 150,
        fill: "#FEF3C7",
        text: "New Note",
      };
    } else if (tool === "text") {
      newElement = {
        id,
        type: "text",
        x: pos.x,
        y: pos.y,
        width: 200,
        height: 30,
        stroke: color,
        text: "Type here...",
      };
    } else {
      return;
    }

    setElements((prev) => [...prev, newElement]);
    dirtyRef.current = true;
    setSelectedId(id);
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    // Broadcast cursor position
    socketRef.current?.emit("cursor", {
      roomId,
      cursor: { id: userName, userName, position: pos },
    });

    if (!isDrawing) return;

    setElements((prev) => {
      const lastElement = prev[prev.length - 1];
      if (!lastElement) return prev;

      const updated = { ...lastElement };

      if (tool === "pen") {
        updated.points = [...(updated.points || []), pos.x, pos.y];
      } else if (tool === "rect" || tool === "circle") {
        updated.width = pos.x - updated.x;
        updated.height = pos.y - updated.y;
      } else if (tool === "arrow" || tool === "line") {
        const points = [...(updated.points || [])];
        points[2] = pos.x;
        points[3] = pos.y;
        updated.points = points;
      }

      return [...prev.slice(0, -1), updated];
    });
    dirtyRef.current = true;
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const lastElement = elements[elements.length - 1];
    if (lastElement) {
      socketRef.current?.emit("draw", { roomId, element: lastElement });
    }
  };

  const handleStickyDblClick = (el: Element) => {
    setEditingId(el.id);
    setEditingText(el.text || "");
  };

  const handleTextDblClick = (el: Element) => {
    setEditingId(el.id);
    setEditingText(el.text || "");
  };

  const handleEditingBlur = () => {
    if (editingId) {
      const updates = { text: editingText };
      setElements((prev) =>
        prev.map((el) => (el.id === editingId ? { ...el, ...updates } : el))
      );
      dirtyRef.current = true;
      socketRef.current?.emit("update", { roomId, elementId: editingId, updates });
      setEditingId(null);
    }
  };

  const clearBoard = () => {
    setElements([]);
    dirtyRef.current = true;
    socketRef.current?.emit("clear", roomId);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements((prev) => prev.filter((el) => el.id !== selectedId));
      dirtyRef.current = true;
      socketRef.current?.emit("delete", { roomId, elementId: selectedId });
      setSelectedId(null);
    }
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const updates = {
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
      rotation: node.rotation(),
    };
    node.scaleX(1);
    node.scaleY(1);
    
    setElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, ...updates } : el))
    );
    dirtyRef.current = true;
    socketRef.current?.emit("update", { roomId, elementId: selectedId, updates });
  };

  const handleDragEnd = (e: any, id: string) => {
    const updates = {
      x: e.target.x(),
      y: e.target.y(),
    };
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
    dirtyRef.current = true;
    socketRef.current?.emit("update", { roomId, elementId: id, updates });
  };

  const exportImage = () => {
    const stage = stageRef.current;
    const drawingCanvas = stage.toCanvas({ pixelRatio: 2 });
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = drawingCanvas.width;
    exportCanvas.height = drawingCanvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      toast.error("Unable to export image");
      return;
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(drawingCanvas, 0, 0);
    const uri = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `whiteboard-${roomId}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    const stage = stageRef.current;
    const dataUrl = stage.toDataURL();
    const pdf = new jsPDF("l", "px", [stage.width(), stage.height()]);
    pdf.addImage(dataUrl, "PNG", 0, 0, stage.width(), stage.height());
    pdf.save(`whiteboard-${roomId}.pdf`);
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link. Please copy the URL manually.");
    }
  };

  const loadDemoData = () => {
    const demoElements: Element[] = [
      {
        id: nanoid(),
        type: "rect",
        x: 200,
        y: 200,
        width: 300,
        height: 200,
        stroke: "#3B82F6",
        strokeWidth: 4,
      },
      {
        id: nanoid(),
        type: "circle",
        x: 600,
        y: 300,
        width: 150,
        height: 150,
        stroke: "#10B981",
        strokeWidth: 4,
      },
      {
        id: nanoid(),
        type: "sticky",
        x: 400,
        y: 450,
        width: 200,
        height: 200,
        fill: "#FEF3C7",
        text: "Collaborative Whiteboard Demo\n\n- Real-time cursors\n- Multi-user drawing\n- Export to PDF/PNG",
      },
      {
        id: nanoid(),
        type: "arrow",
        x: 0,
        y: 0,
        points: [500, 250, 600, 300],
        stroke: "#EF4444",
        strokeWidth: 4,
      }
    ];

    setElements((prev) => [...prev, ...demoElements]);
    dirtyRef.current = true;
    
    // Broadcast demo elements
    demoElements.forEach(el => {
      socketRef.current?.emit("draw", { roomId, element: el });
    });
  };

  const socketBasedCount = participants.length + (isSocketConnected ? 1 : 0);
  const cursorBasedCount = isSocketConnected ? Object.keys(cursors).length + 1 : 0;
  const onlineCount = isSocketConnected
    ? Math.max(socketBasedCount, cursorBasedCount, 1)
    : boardOnlineCount;

  return (
    loadingBoard ? (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    ) : (
    <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden relative">
      {/* Top Bar */}
      <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shrink-0">
            <lucideReact.Layout size={16} className="md:w-[18px] md:h-[18px]" />
          </div>
          <div className="hidden sm:block">
            <h2 className="font-bold text-slate-900 leading-tight truncate max-w-[80px] sm:max-w-[120px] md:max-w-none text-sm md:text-base">Room: {roomId}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Live</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <div className="flex -space-x-2 mr-1 md:mr-4">
            <div 
              title={userName}
              className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-blue-600 uppercase shrink-0 shadow-sm overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                userName.charAt(0)
              )}
            </div>
            {participants.slice(0, 2).map((p, i) => (
              <div 
                key={p.id} 
                title={p.name}
                className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-slate-600 uppercase shrink-0 shadow-sm"
                style={{ backgroundColor: `hsl(${i * 60}, 70%, 80%)` }}
              >
                {p.name.charAt(0)}
              </div>
            ))}
            {participants.length > 2 && (
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-slate-500 shrink-0 shadow-sm">
                +{participants.length - 2}
              </div>
            )}
          </div>

          <button 
            onClick={copyInviteLink}
            className={`flex items-center gap-1.5 p-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all ${isCopied ? "bg-green-100 text-green-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
            title="Invite"
          >
            <lucideReact.Share2 size={14} className="md:w-4 md:h-4" />
            <span className="hidden xs:inline">{isCopied ? "Copied!" : "Invite"}</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-0.5 md:mx-1" />

          <button
            onClick={() => persistBoard("manual")}
            disabled={isSaving}
            className="flex items-center gap-1.5 p-1.5 md:px-4 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all shadow-sm disabled:opacity-70"
            title="Save"
          >
            <lucideReact.Save size={14} className="md:w-4 md:h-4" />
            <span className="hidden xs:inline">{isSaving ? "Saving..." : "Save"}</span>
          </button>

          <div className="group relative">
            <button className="flex items-center gap-1.5 p-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all shadow-sm">
              <lucideReact.Download size={14} className="md:w-4 md:h-4" />
              <span className="hidden xs:inline">Export</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-40 md:w-48 bg-white rounded-xl md:rounded-2xl shadow-xl border border-slate-100 py-1.5 md:py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button onClick={exportImage} className="w-full px-3 md:px-4 py-1.5 md:py-2 text-left text-xs md:text-sm hover:bg-slate-50 flex items-center gap-2 md:gap-3">
                <lucideReact.FileImage size={14} className="text-slate-400 md:w-4 md:h-4" />
                <span>Save as Image</span>
              </button>
              <button onClick={exportPDF} className="w-full px-3 md:px-4 py-1.5 md:py-2 text-left text-xs md:text-sm hover:bg-slate-50 flex items-center gap-2 md:gap-3">
                <lucideReact.FileText size={14} className="text-slate-400 md:w-4 md:h-4" />
                <span>Save as PDF</span>
              </button>
            </div>
          </div>

          <button 
            onClick={handleLeaveRoom}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            title="Leave Room"
          >
            <lucideReact.LogOut size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      {/* Toolbar - Responsive: Left on desktop, Bottom on mobile */}
      <div className="absolute bottom-8 md:bottom-8 left-1/2 -translate-x-1/2 md:left-6 md:top-20 md:translate-x-0 flex flex-col md:flex-col justify-end md:justify-center gap-3 md:gap-6 z-20 w-[98%] sm:w-[90%] md:w-auto h-auto md:h-[calc(100vh-112px)]">
        <div className="bg-white/95 backdrop-blur-md p-1.5 md:p-2.5 rounded-2xl md:rounded-[1.75rem] toolbar-shadow border border-slate-200/50 flex flex-row md:flex-col gap-1 md:gap-1 overflow-x-auto md:overflow-y-auto md:overflow-x-visible no-scrollbar items-center">
          <div className="flex flex-row md:flex-col gap-1 md:gap-1">
            <ToolButton active={tool === "mouse"} onClick={() => setTool("mouse")} icon={<lucideReact.MousePointer2 size={isMobile ? 18 : 20} />} title="Select" />
            <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} icon={<lucideReact.Pencil size={isMobile ? 18 : 20} />} title="Pen" />
            <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} icon={<lucideReact.Eraser size={isMobile ? 18 : 20} />} title="Eraser" />
          </div>
          
          <div className="w-px h-6 md:w-6 md:h-px bg-slate-200/60 mx-1 md:my-1.5 md:mx-auto shrink-0" />
          
          <div className="flex flex-row md:flex-col gap-1 md:gap-1">
            <ToolButton active={tool === "rect"} onClick={() => setTool("rect")} icon={<lucideReact.Square size={isMobile ? 18 : 20} />} title="Rectangle" />
            <ToolButton active={tool === "circle"} onClick={() => setTool("circle")} icon={<lucideReact.Circle size={isMobile ? 18 : 20} />} title="Circle" />
            <ToolButton active={tool === "arrow"} onClick={() => setTool("arrow")} icon={<lucideReact.ArrowUpRight size={isMobile ? 18 : 20} />} title="Arrow" />
            <ToolButton active={tool === "line"} onClick={() => setTool("line")} icon={<lucideReact.Minus size={isMobile ? 18 : 20} />} title="Line" />
          </div>

          <div className="w-px h-6 md:w-6 md:h-px bg-slate-200/60 mx-1 md:my-1.5 md:mx-auto shrink-0" />

          <div className="flex flex-row md:flex-col gap-1 md:gap-1">
            <ToolButton active={tool === "text"} onClick={() => setTool("text")} icon={<lucideReact.Type size={isMobile ? 18 : 20} />} title="Text" />
            <ToolButton active={tool === "sticky"} onClick={() => setTool("sticky")} icon={<lucideReact.StickyNote size={isMobile ? 18 : 20} />} title="Sticky Note" />
          </div>

          <div className="w-px h-6 md:w-6 md:h-px bg-slate-200/60 mx-1 md:my-1.5 md:mx-auto shrink-0" />
          
          <div className="flex flex-row md:flex-col gap-1 md:gap-1">
            <ToolButton active={false} onClick={loadDemoData} icon={<lucideReact.Layout size={isMobile ? 18 : 20} />} title="Load Demo Elements" className="text-blue-500 hover:bg-blue-50" />
            <ToolButton active={false} onClick={clearBoard} icon={<lucideReact.Trash2 size={isMobile ? 18 : 20} />} title="Clear Board" className="text-red-500 hover:bg-red-50" />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-1.5 md:p-2.5 rounded-2xl md:rounded-[1.75rem] toolbar-shadow border border-slate-200/50 flex flex-row md:flex-col gap-2.5 md:gap-4 items-center shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex flex-row md:grid md:grid-cols-2 gap-1.5 md:gap-2 shrink-0">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 md:w-5.5 md:h-5.5 rounded-full border-2 transition-all shrink-0 ${color === c ? "border-slate-900 scale-125 shadow-sm" : "border-transparent hover:scale-110"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-6 md:w-6 md:h-px bg-slate-200/60 shrink-0" />
          <div className="flex flex-row md:flex-col gap-2 md:gap-2 shrink-0">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`w-8 h-8 md:w-8.5 md:h-8.5 rounded-lg md:rounded-xl flex items-center justify-center transition-all shrink-0 ${strokeWidth === w ? "bg-slate-100 text-slate-900 shadow-inner" : "text-slate-400 hover:bg-slate-50"}`}
              >
                <div style={{ height: Math.max(2, w/1.5), width: isMobile ? "14px" : "16px", backgroundColor: color, borderRadius: 999 }} className="md:w-[70%]" />
              </button>
            ))}
          </div>
        </div>

        {selectedId && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={deleteSelected}
            className="bg-red-500 text-white p-3 md:p-4.5 rounded-2xl shadow-lg shadow-red-200 hover:bg-red-600 transition-all flex items-center justify-center absolute -top-14 md:static left-1/2 -translate-x-1/2 md:translate-x-0"
          >
            <lucideReact.Trash2 size={isMobile ? 20 : 24} />
          </motion.button>
        )}
      </div>

      {/* Canvas */}
      <main ref={containerRef} className="flex-grow relative canvas-container overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            {elements.map((el) => {
              if (el.type === "pen") {
                return (
                  <Line
                    key={el.id}
                    id={el.id}
                    points={el.points}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    draggable={tool === "mouse"}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onClick={() => tool === "mouse" && setSelectedId(el.id)}
                  />
                );
              }
              if (el.type === "rect") {
                return (
                  <Rect
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    draggable={tool === "mouse"}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onClick={() => tool === "mouse" && setSelectedId(el.id)}
                    onTransformEnd={handleTransformEnd}
                  />
                );
              }
              if (el.type === "circle") {
                return (
                  <Circle
                    key={el.id}
                    id={el.id}
                    x={el.x + (el.width || 0) / 2}
                    y={el.y + (el.height || 0) / 2}
                    radius={Math.abs((el.width || 0) / 2)}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    draggable={tool === "mouse"}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onClick={() => tool === "mouse" && setSelectedId(el.id)}
                    onTransformEnd={handleTransformEnd}
                  />
                );
              }
              if (el.type === "arrow") {
                return (
                  <Arrow
                    key={el.id}
                    id={el.id}
                    points={el.points}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    fill={el.stroke}
                    draggable={tool === "mouse"}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onClick={() => tool === "mouse" && setSelectedId(el.id)}
                  />
                );
              }
              if (el.type === "line") {
                return (
                  <Line
                    key={el.id}
                    id={el.id}
                    points={el.points}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    draggable={tool === "mouse"}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onClick={() => tool === "mouse" && setSelectedId(el.id)}
                  />
                );
              }
              if (el.type === "text") {
                return (
                  <Text
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    text={el.text}
                    fontSize={20}
                    fontFamily="Inter"
                    fill={el.stroke}
                    draggable={tool === "mouse"}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onClick={() => tool === "mouse" && setSelectedId(el.id)}
                    onDblClick={() => handleTextDblClick(el)}
                    onTransformEnd={handleTransformEnd}
                  />
                );
              }
              if (el.type === "sticky") {
                return (
                  <Group
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    draggable={tool === "mouse"}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onClick={() => tool === "mouse" && setSelectedId(el.id)}
                    onDblClick={() => handleStickyDblClick(el)}
                    onTransformEnd={handleTransformEnd}
                  >
                    <Rect
                      width={el.width}
                      height={el.height}
                      fill={el.fill}
                      shadowBlur={10}
                      shadowOpacity={0.1}
                      cornerRadius={4}
                    />
                    <Text
                      text={el.text}
                      width={el.width}
                      height={el.height}
                      padding={20}
                      fontSize={16}
                      fontFamily="Inter"
                      verticalAlign="middle"
                      align="center"
                    />
                  </Group>
                );
              }
              return null;
            })}

            {selectedId && tool === "mouse" && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}

            {/* Remote Cursors */}
            {Object.values(cursors).map((cursor) => (
              <Group key={cursor.id} x={cursor.position.x} y={cursor.position.y}>
                <Path
                  data="M0,0 L0,18 L5,13 L11,13 Z"
                  fill="#3B82F6"
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
                <Text
                  text={cursor.userName}
                  y={22}
                  fontSize={10}
                  fontFamily="Inter"
                  fill="#3B82F6"
                  fontStyle="bold"
                />
              </Group>
            ))}
          </Layer>
        </Stage>

        {/* Sticky Note / Text Editor Overlay */}
        {editingId && (
          <div 
            className="absolute z-50 bg-white shadow-2xl rounded-lg p-2 border border-slate-200"
            style={{
              left: elements.find(el => el.id === editingId)?.x || 0,
              top: elements.find(el => el.id === editingId)?.y || 0,
              width: elements.find(el => el.id === editingId)?.width || 150,
              height: elements.find(el => el.id === editingId)?.height || 150,
              minHeight: 40,
            }}
          >
            <textarea
              ref={textareaRef}
              className="w-full h-full p-2 outline-none resize-none bg-transparent font-sans text-sm"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={handleEditingBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEditingBlur();
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Footer / Status */}
      <footer className="h-8 md:h-10 bg-white border-t border-slate-200 px-4 md:px-6 flex items-center justify-between z-20 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2 md:gap-4">
          <span>{onlineCount} <span className="hidden xs:inline">Online</span></span>
          <div className="h-3 w-px bg-slate-200" />
          <span>{elements.length} <span className="hidden xs:inline">Elements</span></span>
        </div>
        <div className="truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
          <span className="hidden xs:inline">Connected as </span><span className="text-slate-900">{userName}</span>
        </div>
      </footer>
    </div>
    )
  );
}

function ToolButton({ active, onClick, icon, title, className = "" }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 md:p-3.5 rounded-xl md:rounded-2xl transition-all shrink-0 flex items-center justify-center ${active ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-100/80"} ${className}`}
    >
      {icon}
    </button>
  );
}
