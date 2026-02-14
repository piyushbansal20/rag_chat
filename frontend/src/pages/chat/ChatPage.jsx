import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Square, Sparkles, User, FileText, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI, sendMessageWithStream } from '../../api/chat.api.js';
import { useChatStore } from '../../stores/chatStore.js';
import { Button, Spinner, Avatar, DynamicChart, parseChartFromContent } from '../../components/ui/index.js';
import { cn } from '../../lib/cn.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    isStreaming,
    streamingContent,
    setStreaming,
    appendStreamContent,
    clearStreamContent,
    setActiveSession,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [abortController, setAbortController] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ['chat', 'session', sessionId],
    queryFn: () => chatAPI.getSession(sessionId),
    enabled: !!sessionId,
    select: (res) => res.data.data,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => chatAPI.createSession({}),
    onSuccess: (res) => {
      const newSession = res.data.data;
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      navigate(`/chat/${newSession._id}`, { replace: true });
    },
  });

  useEffect(() => {
    if (!sessionId && !createSessionMutation.isPending) {
      createSessionMutation.mutate();
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      setActiveSession(sessionId);
    }
  }, [sessionId, setActiveSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionData?.messages, streamingContent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !sessionId) return;

    const message = input.trim();
    setInput('');
    clearStreamContent();
    setStreaming(true);

    queryClient.setQueryData(['chat', 'session', sessionId], (old) => {
      if (!old) return old;
      const existingMessages = old.data?.data?.messages || [];
      return {
        ...old,
        data: {
          ...old.data,
          data: {
            ...old.data.data,
            messages: [
              ...existingMessages,
              {
                _id: `temp-${Date.now()}`,
                role: 'user',
                content: message,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      };
    });

    const controller = sendMessageWithStream(sessionId, message, {
      onStart: () => {},
      onChunk: (chunk) => {
        appendStreamContent(chunk);
      },
      onDone: (data) => {
        setStreaming(false);
        clearStreamContent();
        queryClient.invalidateQueries({ queryKey: ['chat', 'session', sessionId] });
        queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      },
      onError: (error) => {
        setStreaming(false);
        clearStreamContent();
        console.error('Stream error:', error);
      },
    });

    setAbortController(controller);
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setStreaming(false);
      clearStreamContent();
    }
  };

  const messages = sessionData?.messages || [];

  if (!sessionId || createSessionMutation.isPending) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-main)] dark:bg-slate-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">Creating new chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[var(--bg-main)] dark:bg-slate-900">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isSessionLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                How can I help you today?
              </h2>
              <p className="text-gray-500 dark:text-slate-400 max-w-md leading-relaxed">
                Ask questions about your uploaded documents. I'll search through your knowledge base to find relevant answers.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  'Summarize the key points from my documents',
                  'What policies are mentioned in the documents?',
                  'Find information about specific topics',
                  'Compare data across documents',
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-3 text-left text-sm text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-white dark:hover:bg-blue-900/20 hover:shadow-md transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message._id}
                  message={message}
                  user={user}
                  isLast={index === messages.length - 1 && !isStreaming}
                />
              ))}

              {isStreaming && streamingContent && (
                <MessageBubble
                  message={{
                    _id: 'streaming',
                    role: 'assistant',
                    content: streamingContent,
                  }}
                  isStreaming
                />
              )}

              {isStreaming && !streamingContent && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-slate-800 bg-[var(--bg-main)] dark:bg-slate-900 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-5 py-3.5 pr-12 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                disabled={isStreaming}
              />
            </div>
            {isStreaming ? (
              <Button
                type="button"
                onClick={handleStop}
                variant="danger"
                size="lg"
                className="px-6 rounded-2xl"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                size="lg"
                className="px-6 rounded-2xl"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-slate-400 mt-3">
            AI responses are generated from your uploaded documents
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, user, isStreaming, isLast }) {
  const isUser = message.role === 'user';

  // Parse chart data from assistant messages (supports multiple charts)
  const { text: textContent, charts } = isUser
    ? { text: message.content, charts: [] }
    : parseChartFromContent(message.content);

  return (
    <div className={cn('flex gap-4 animate-fade-in', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
          <User className="h-5 w-5 text-white" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
          <Bot className="h-5 w-5 text-white" />
        </div>
      )}

      <div
        className={cn(
          'flex-1 max-w-[85%] rounded-2xl p-5 shadow-sm',
          isUser
            ? 'bg-blue-600 text-white ml-auto'
            : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-100 dark:border-slate-700'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <>
            {charts.length > 0 && (
              <div className="space-y-4">
                {charts.map((chartData, index) => (
                  <DynamicChart key={index} chartData={chartData} />
                ))}
              </div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {textContent}
              </ReactMarkdown>
            </div>
          </>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Sources
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-medium"
                >
                  {source.documentName}
                </span>
              ))}
            </div>
          </div>
        )}

        {isStreaming && (
          <span className="inline-block w-0.5 h-5 bg-emerald-500 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
}
