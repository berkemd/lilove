import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pushNotifications } from "./lib/pushNotifications";

// Initialize push notifications service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await pushNotifications.initialize();
      console.log('Push notifications initialized');
    } catch (error) {
      console.log('Push notifications initialization failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
