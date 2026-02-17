import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import "./styles.css";
import AuthPrompt from "./components/AuthPrompt";
import ChatPanel from "./components/ChatPanel";
import ChatSidebar from "./components/ChatSidebar";
import Button from "./components/ui/Button";
import LoadingStatus from "./components/LoadingStatus";
import { generateResumeDesignStream, extractJsonFromResponse } from "./services/gemini";
import pdfMake from 'pdfmake/build/pdfmake';
// vfs_fonts.js assigns to global pdfMake.vfs, so we import it for side effects
import 'pdfmake/build/vfs_fonts';

// Handle different module formats (ESM/CJS/Bundled)
const vfs = window.pdfMake?.vfs || pdfMake.vfs;
if (vfs) {
  pdfMake.vfs = vfs;
} else {
  console.warn("Could not find pdfMake vfs fonts. PDF generation might fail.");
}

const QUICK_PROMPTS = [
  "Create a one-page software engineer resume",
  "Rewrite summary for product manager role",
  "Improve ATS keywords for data analyst jobs",
  "Turn responsibilities into quantified achievements",
];

const WELCOME_MSG = {
  role: "assistant",
  text: "Share your role target, years of experience, and 3 measurable wins. I will shape it into a stronger resume.",
};

export default function App() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [convoLoading, setConvoLoading] = useState(true);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [chatInput, setChatInput] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resumeDesign, setResumeDesign] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const activeConvoRef = useRef(activeConvoId);
  activeConvoRef.current = activeConvoId;

  const canSend = chatInput.trim().length > 0;
  const profileInitial = session?.user?.email?.trim()?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) { setStatus(error.message); return; }
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus("");
      setProfileOpen(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const loadConversations = useCallback(async () => {
    if (!session) return;
    setConvoLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (!error && data) setConversations(data);
    setConvoLoading(false);
  }, [session]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const selectConversation = useCallback(async (id) => {
    if (id === activeConvoId) { setSidebarOpen(false); return; }
    setActiveConvoId(id);
    setSidebarOpen(false);

    const { data: msgs } = await supabase
      .from("messages")
      .select("role, text, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    setMessages(msgs && msgs.length > 0 ? msgs : [WELCOME_MSG]);
    setResumeDesign(null);
    setPdfUrl(null);
  }, [activeConvoId]);

  const createNewConversation = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: session.user.id, title: "New Resume" })
      .select("id, title, updated_at")
      .single();

    if (error) { setStatus(error.message); return; }

    setConversations((prev) => [data, ...prev]);
    setActiveConvoId(data.id);
    setMessages([WELCOME_MSG]);
    setResumeDesign(null);
    setPdfUrl(null);
    setChatInput("");
    setSidebarOpen(false);
  }, [session]);

  const deleteConversation = useCallback(async (id) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvoId === id) {
      setActiveConvoId(null);
      setMessages([WELCOME_MSG]);
      setResumeDesign(null);
      setPdfUrl(null);
    }
  }, [activeConvoId]);

  useEffect(() => {
    if (session && !convoLoading && conversations.length === 0 && !activeConvoId) {
      createNewConversation();
    }
    if (session && !convoLoading && conversations.length > 0 && !activeConvoId) {
      selectConversation(conversations[0].id);
    }
  }, [session, convoLoading, conversations.length, activeConvoId, createNewConversation, selectConversation]);

  const submitMessage = useCallback(async (text) => {
    const normalized = text.trim();
    if (!normalized || !activeConvoRef.current) return;

    const userMsg = { role: "user", text: normalized };
    const assistantMsg = { role: "assistant", text: "" }; // Start empty

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setChatInput("");
    setIsLoading(true);
    setStatus(""); // Clear status, we will use the chat bubble

    const convoId = activeConvoRef.current;

    // Save user message
    await supabase.from("messages").insert([{ conversation_id: convoId, ...userMsg }]);

    try {
      let fullText = "";
      const stream = generateResumeDesignStream(normalized, "", resumeDesign);

      for await (const chunk of stream) {
        fullText += chunk;

        // Hide JSON and Artifact markers from the UI
        let visibleText = fullText;
        if (visibleText.includes(":::ARTIFACT:::")) {
          visibleText = visibleText.split(":::ARTIFACT:::")[0].trim();
        } else if (visibleText.includes(":::JSON_START:::")) {
          visibleText = visibleText.split(":::JSON_START:::")[0].trim();
        }

        setMessages((prev) => {
          const newHistory = [...prev];
          const lastIndex = newHistory.length - 1;
          if (newHistory[lastIndex].role === "assistant") {
            newHistory[lastIndex] = { ...newHistory[lastIndex], text: visibleText };
          }
          return newHistory;
        });
      }

      // Extract and Apply JSON
      const newDesign = extractJsonFromResponse(fullText);

      // Determine final visible text
      let finalText = fullText;
      if (finalText.includes(":::ARTIFACT:::")) {
        finalText = finalText.split(":::ARTIFACT:::")[0].trim();
      } else if (finalText.includes(":::JSON_START:::")) {
        finalText = finalText.split(":::JSON_START:::")[0].trim();
      }

      if (newDesign) {
        setResumeDesign(newDesign);
        // Persist the artifact data with the message
        await supabase.from("messages").insert([{
          conversation_id: convoId,
          role: "assistant",
          text: finalText,
          // We can store structured data in a separate column if we had one, 
          // but for now we'll rely on the text content or just update the in-memory state.
          // ideal: metadata: { resume_snapshot: newDesign } 
        }]);

        // Update local state to include the artifact data specifically for this message
        // This is crucial for the UI to render the card
        setMessages(prev => {
          const newHistory = [...prev];
          const lastIndex = newHistory.length - 1;
          newHistory[lastIndex] = {
            ...newHistory[lastIndex],
            text: finalText,
            resumeData: newDesign // Attach data for "Time Travel"
          };
          return newHistory;
        });
      } else {
        await supabase.from("messages").insert([{ conversation_id: convoId, role: "assistant", text: finalText }]);
      }

    } catch (error) {
      console.error("Streaming/Generation Error:", error);
      const errorMsg = {
        role: "assistant",
        text: `Error: ${error.message}. Please try again.`,
      };
      setMessages((prev) => {
        // Replace the empty/partial message with error
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = errorMsg;
        return newHistory;
      });
      setIsLoading(false);
    }
  }, [resumeDesign]);

  useEffect(() => {
    if (resumeDesign) {
      try {
        const pdfDocGenerator = pdfMake.createPdf(resumeDesign);
        pdfDocGenerator.getBlob((blob) => {
          if (pdfUrl) URL.revokeObjectURL(pdfUrl);
          const url = URL.createObjectURL(blob);
          setPdfUrl(url + '#toolbar=0&navpanes=0&view=FitH');
        });
      } catch (e) {
        console.error("Error generating PDF preview:", e);
      }
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    }
  }, [resumeDesign]);

  const handleSendMessage = () => submitMessage(chatInput);
  const handleQuickPrompt = (prompt) => submitMessage(prompt);
  const handleChatKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleDownloadPdf = useCallback(() => {
    if (resumeDesign) {
      try {
        pdfMake.createPdf(resumeDesign).download('resume.pdf');
      } catch (e) {
        console.error("Error downloading PDF:", e);
        alert("Failed to generate PDF. The design might be invalid.");
      }
    }
  }, [resumeDesign]);

  const handlePreviewResume = useCallback((design) => {
    if (design) {
      setResumeDesign(design);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setStatus("Redirecting to Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setStatus(error.message);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { setStatus(error.message); return; }
    setStatus("You are logged out.");
    setConversations([]);
    setActiveConvoId(null);
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-3xl animate-pulse-slow" style={{ animationDelay: "1.5s" }}></div>
        </div>
        <div className="z-10 w-full">
          <AuthPrompt onLogin={handleGoogleLogin} />
          <div className="mt-8">
            <LoadingStatus status={status} isLoading={isLoading} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-background font-sans text-surface-foreground">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed md:relative z-50 md:z-auto h-full md:h-auto transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:-translate-x-full'} overflow-hidden shrink-0`}>
        <div className="w-72 h-full">
          <ChatSidebar
            conversations={conversations}
            activeId={activeConvoId}
            onSelect={selectConversation}
            onNew={createNewConversation}
            onDelete={deleteConversation}
            onClose={() => setSidebarOpen(false)}
            loading={convoLoading}
          />
        </div>
      </div>

      <header className="flex md:hidden items-center justify-between px-3 py-2 border-b border-border bg-surface shrink-0 z-30 relative">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
          <span className="text-sm font-semibold text-surface-foreground">10x Resume AI</span>
        </div>

        <div className="flex items-center gap-2">
          {pdfUrl && (
            <Button variant="ghost" size="sm" onClick={() => setPdfUrl(pdfUrl)} className="gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              View
            </Button>
          )}
          {resumeDesign && (
            <Button variant="primary" size="sm" onClick={handleDownloadPdf} className="gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              PDF
            </Button>
          )}
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-[49px] left-0 right-0 z-40 md:hidden bg-surface border-b border-border shadow-xl animate-fade-in">
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => { setSidebarOpen((v) => !v); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
                Chat History
              </button>

              <button
                onClick={() => { createNewConversation(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Chat
              </button>

              {pdfUrl && (
                <button
                  onClick={() => { setPdfUrl(pdfUrl); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  View Resume
                </button>
              )}

              {resumeDesign && (
                <button
                  onClick={() => { handleDownloadPdf(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  Download PDF
                </button>
              )}

              <div className="border-t border-border/50 my-1" />

              <div className="px-3 py-2">
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Signed in as</p>
                <p className="text-xs font-semibold truncate text-surface-foreground mt-0.5">{session.user.email}</p>
              </div>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      <aside className="hidden md:flex md:order-first md:w-14 md:flex-col items-center md:py-4 md:px-0 md:border-r border-border bg-surface z-30 shrink-0">
        <nav className="flex flex-col flex-1 items-center justify-start gap-3 w-full px-1.5">
          <Button
            variant="ghost"
            size="icon"
            className={`${sidebarOpen ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-slate-200'}`}
            title="Chat history"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </Button>
        </nav>

        <div className="relative group">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold border-2 border-transparent hover:border-indigo-400 transition-colors focus:outline-none"
          >
            {profileInitial}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute left-12 bottom-0 w-60 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-border animate-fade-in z-50">
                <div className="p-3 border-b border-border/50">
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-semibold truncate text-surface-foreground mt-1">{session.user.email}</p>
                </div>
                <div className="p-2 mt-1">
                  <Button variant="ghost" className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={handleLogout}>
                    Sign out
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <div className="flex-1 flex flex-col h-full">
          <ChatPanel
            messages={messages}
            chatInput={chatInput}
            canSend={canSend && !isLoading}
            status={status}
            isLoading={isLoading}
            quickPrompts={QUICK_PROMPTS}
            onChatInputChange={(e) => setChatInput(e.target.value)}
            onChatKeyDown={handleChatKeyDown}
            onSend={handleSendMessage}
            onQuickPrompt={handleQuickPrompt}
            onPreviewResume={handlePreviewResume}
          />
        </div>

        {/* PDF Preview Side Panel */}
        <div className="hidden md:flex w-[500px] border-l border-border bg-slate-100 dark:bg-slate-900/50 flex-col shrink-0">
          <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface">
            <h2 className="text-sm font-semibold text-surface-foreground">Resume Preview</h2>
            {resumeDesign && (
              <Button variant="primary" size="sm" onClick={handleDownloadPdf} className="gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                Download
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            {pdfUrl ? (
              <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-none"
                  title="Resume Preview"
                />
              </div>
            ) : (
              <div className="text-center text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-3 opacity-30">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="text-sm">Your resume will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile PDF Preview Modal */}
        {pdfUrl && (
          <div className="md:hidden fixed inset-0 bg-black/80 z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-surface border-b border-border">
              <h2 className="text-sm font-semibold text-surface-foreground">Resume Preview</h2>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleDownloadPdf} className="gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  PDF
                </Button>
                <button
                  onClick={() => setPdfUrl(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-none"
                  title="Resume Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
