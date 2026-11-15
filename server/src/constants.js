// Socket.io namespaces: one server, two "channels".
// The client connects to  <SERVER_URL>/ttt  or  <SERVER_URL>/quiz
export const NAMESPACES = {
  TIC_TAC_TOE: "/ttt",
  QUIZ: "/quiz",
};

// Quiz Clash game rules (these were magic numbers inside server2.js)
export const QUIZ_QUESTION_TIME_MS = 30000; // time allowed per question
export const QUIZ_REVEAL_DELAY_MS = 3000; // pause on the reveal screen
export const QUIZ_ROOM_CLEANUP_MS = 30000; // delete a finished room after this
export const QUIZ_POINTS_PER_CORRECT = 10;
export const QUIZ_MIN_PLAYERS = 2; // game auto-starts when this many join

// Input limits (checked on the server, the browser form is not trusted)
export const MAX_NAME_LENGTH = 40; // player name, room ID, quiz name
export const QUIZ_MAX_QUESTIONS = 50;
export const QUIZ_MAX_QUESTION_LENGTH = 300;
export const QUIZ_MIN_ANSWERS = 2;
export const QUIZ_MAX_ANSWERS = 6;
export const QUIZ_MAX_ANSWER_LENGTH = 150;
export const TTT_MAX_MESSAGE_LENGTH = 500; // chat message

export const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";
