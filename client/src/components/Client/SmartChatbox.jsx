import React, { useState, useEffect, useRef } from "react";

const API_URL = "http://localhost:5000/api/chat";

const SmartChatBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("style");
  const [isTyping, setIsTyping] = useState(false);

  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hi 👋 Mình là AI Stylist. Bạn cần tư vấn outfit hay chọn size?",
    },
  ]);

  const chatEndRef = useRef(null);

  const suggestionData = {
    style: [
      { label: "Đi tiệc 💃", prompt: "tư vấn đồ đi party" },
      { label: "Đi chơi 🎉", prompt: "outfit đi chơi" },
      { label: "Phối màu 🎨", prompt: "cách phối màu quần áo" },
    ],

    size: [
      { label: "Tính size 📏", prompt: "1m70 65kg mặc size gì" },
      { label: "Oversize 😎", prompt: "1m70 65kg oversize" },
    ],

    support: [
      { label: "Đổi trả 🔄", prompt: "chính sách đổi trả" },
      { label: "Mã giảm giá 🎁", prompt: "có mã giảm giá không" },
    ],
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const sendMessage = async (text) => {
    const userText = text || message;

    if (!userText.trim()) return;

    setChatHistory((prev) => [
      ...prev,
      { id: Date.now(), type: "user", text: userText },
    ]);

    setMessage("");
    setIsTyping(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();

      setIsTyping(false);

      setChatHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "bot",
          text: data.reply,
          products: data.products || [],
        },
      ]);
    } catch {
      setIsTyping(false);

      setChatHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "bot",
          text: "Server đang bận 😢 thử lại sau nhé!",
        },
      ]);
    }
  };

  return (
    <div style={styles.wrapper}>
      {!isOpen && (
        <div style={styles.tooltip}>
          hỏi shop tại đây ✨<div style={styles.tooltipArrow}></div>
        </div>
      )}

      <button style={styles.floatBtn} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "✕" : "🧸"}
      </button>

      {isOpen && (
        <div style={styles.container}>
          <div style={styles.header}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/6997/6997662.png"
              alt=""
              style={styles.avatar}
            />

            <div style={styles.title}>AI STYLIST</div>
          </div>

          <div style={styles.chatBody}>
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                style={msg.type === "bot" ? styles.botRow : styles.userRow}
              >
                <div
                  style={
                    msg.type === "bot" ? styles.botBubble : styles.userBubble
                  }
                >
                  {msg.text}

                  {msg.products?.length > 0 && (
                    <div style={styles.productList}>
                      {msg.products.map((p, i) => (
                        <div
                          key={i}
                          style={styles.productCard}
                          onClick={() =>
                            (window.location.href = `/product/${p._id}`)
                          }
                        >
                          <img src={p.image} style={styles.productImg} />

                          <div style={styles.productName}>{p.name}</div>

                          <div style={styles.productPrice}>
                            {p.price?.toLocaleString()}đ
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={styles.botRow}>
                <div style={styles.typing}>
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}

            <div ref={chatEndRef}></div>
          </div>

          <div style={styles.suggestion}>
            <div style={styles.tabs}>
              {Object.keys(suggestionData).map((tab) => (
                <button
                  key={tab}
                  style={{
                    ...styles.tab,
                    borderBottom:
                      activeTab === tab ? "2px solid #ff69b4" : "none",
                  }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={styles.chips}>
              {suggestionData[activeTab].map((s, i) => (
                <button
                  key={i}
                  style={styles.chip}
                  onClick={() => sendMessage(s.prompt)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.inputArea}>
            <input
              style={styles.input}
              placeholder="Nhắn gì đó..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button style={styles.sendBtn} onClick={() => sendMessage()}>
              🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 1000,
    fontFamily: "sans-serif",
  },

  floatBtn: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    border: "none",
    background: "#FFB6C1",
    fontSize: "28px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  tooltip: {
    position: "absolute",
    bottom: "80px",
    right: "50%",
    transform: "translateX(50%)",
    background: "#333",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "12px",
    fontSize: "12px",
  },

  tooltipArrow: {
    position: "absolute",
    bottom: "-6px",
    left: "50%",
    transform: "translateX(-50%)",
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderTop: "6px solid #333",
  },

  container: {
    position: "absolute",
    bottom: "75px",
    right: "0",
    width: "330px",
    height: "500px",
    background: "#fff",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
  },

  header: {
    background: "#fff0f5",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "35px",
  },

  title: {
    fontWeight: "bold",
    color: "#db7093",
  },

  chatBody: {
    flex: 1,
    padding: "10px",
    overflowY: "auto",
    background: "#fafafa",
  },

  botRow: {
    display: "flex",
    marginBottom: "8px",
  },

  userRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "8px",
  },

  botBubble: {
    background: "#fff",
    padding: "8px 12px",
    borderRadius: "12px",
    maxWidth: "85%",
  },

  userBubble: {
    background: "#ffb6c1",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "12px",
  },

  suggestion: {
    padding: "8px",
    borderTop: "1px solid #eee",
  },

  tabs: {
    display: "flex",
    gap: "10px",
  },

  tab: {
    border: "none",
    background: "none",
    fontSize: "11px",
    cursor: "pointer",
  },

  chips: {
    marginTop: "6px",
    display: "flex",
    gap: "6px",
    overflowX: "auto",
  },

  chip: {
    border: "1px solid #ffb6c1",
    background: "#fff",
    padding: "4px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    cursor: "pointer",
  },

  inputArea: {
    padding: "8px",
    display: "flex",
    gap: "6px",
    borderTop: "1px solid #eee",
  },

  input: {
    flex: 1,
    border: "1px solid #eee",
    borderRadius: "12px",
    padding: "6px 10px",
  },

  sendBtn: {
    border: "none",
    background: "none",
    fontSize: "18px",
    cursor: "pointer",
  },

  productList: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
    overflowX: "auto",
  },

  productCard: {
    minWidth: "95px",
    background: "#fff",
    borderRadius: "10px",
    padding: "6px",
    border: "1px solid #eee",
    cursor: "pointer",
    transition: "0.2s",
  },

  productImg: {
    width: "100%",
    borderRadius: "8px",
  },

  productName: {
    fontSize: "11px",
    marginTop: "4px",
  },

  productPrice: {
    fontSize: "11px",
    color: "#ff4d4f",
  },

  typing: {
    background: "#fff",
    padding: "10px",
    borderRadius: "12px",
    display: "flex",
    gap: "4px",
  },
};

export default SmartChatBox;
