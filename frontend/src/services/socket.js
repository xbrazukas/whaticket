/*import openSocket from "socket.io-client";
import { isObject } from "lodash";

export function socketConnection(params) {
  let userId = null;
  if (localStorage.getItem("userId")) {
    userId = localStorage.getItem("userId");
  }
  return openSocket(process.env.REACT_APP_BACKEND_URL, {
    transports: ["websocket", "polling", "flashsocket"],
    pingTimeout: 18000,
    pingInterval: 18000,
    query: isObject(params) ? { ...params, userId } : { userId },
  });
}
*/
import openSocket from "socket.io-client";
import { isObject } from "lodash";

let socketInstance = null;

export function socketConnection(params) {
  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    // If the socket is already open, return the existing connection.
    return socketInstance;
  }

  // If the socket is closed or in the process of connecting, create a new connection.
  let userId = null;
  if (localStorage.getItem("userId")) {
    userId = localStorage.getItem("userId");
  }
  socketInstance = openSocket(process.env.REACT_APP_BACKEND_URL, {
    transports: ["websocket", "polling", "flashsocket"],
    pingTimeout: 18000,
    pingInterval: 18000,
    query: isObject(params) ? { ...params, userId } : { userId },
  });

  return socketInstance;
}