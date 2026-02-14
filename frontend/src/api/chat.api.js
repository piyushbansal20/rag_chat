import apiClient, { getAccessToken } from '../lib/axios.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const chatAPI = {
  // Sessions
  listSessions: (params) =>
    apiClient.get('/chat/sessions', { params }),

  createSession: (data) =>
    apiClient.post('/chat/sessions', data),

  getSession: (id) =>
    apiClient.get(`/chat/sessions/${id}`),

  updateSession: (id, data) =>
    apiClient.patch(`/chat/sessions/${id}`, data),

  deleteSession: (id) =>
    apiClient.delete(`/chat/sessions/${id}`),

  // Messages
  getMessages: (sessionId, params) =>
    apiClient.get(`/chat/sessions/${sessionId}/messages`, { params }),

  clearMessages: (sessionId) =>
    apiClient.delete(`/chat/sessions/${sessionId}/messages`),

  // Get SSE URL for streaming messages
  getStreamUrl: (sessionId) => {
    return `${API_BASE_URL}/chat/sessions/${sessionId}/messages`;
  },

  // Send message (non-streaming, for reference)
  sendMessage: (sessionId, content) =>
    apiClient.post(`/chat/sessions/${sessionId}/messages`, { content }),
};

/**
 * Send message with SSE streaming
 * @param {string} sessionId
 * @param {string} content
 * @param {Object} callbacks - { onStart, onChunk, onDone, onError }
 * @returns {AbortController} - Call abort() to cancel
 */
export const sendMessageWithStream = (sessionId, content, callbacks) => {
  const { onStart, onChunk, onDone, onError } = callbacks;
  const abortController = new AbortController();

  const sendRequest = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            continue;
          }

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Determine event type from data or previous event line
              if (data.model) {
                onStart?.(data);
              } else if (data.content) {
                onChunk?.(data.content);
              } else if (data.messageId) {
                onDone?.(data);
              } else if (data.message) {
                onError?.(new Error(data.message));
              }
            } catch (e) {
              // Ignore parse errors for incomplete data
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    }
  };

  sendRequest();

  return abortController;
};
