import { badges, conversations, notifications, posts, shopItems, triviaQuestions, users } from "../src/lib/demo-data";

const payload = {
  users,
  posts,
  notifications,
  conversations,
  badges,
  shopItems,
  triviaQuestions,
};

console.log(JSON.stringify(payload, null, 2));
