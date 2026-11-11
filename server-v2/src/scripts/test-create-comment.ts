import "dotenv/config";
import { pool } from "../db/pool.js";
import { createCommentService } from "../services/comment.service.js";

async function main() {
  try {
    await createCommentService({
      postId: "1",
      authorId: "1",
      parentId: "999999",
      content: "Testing an invalid parent",
    });
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

await main();
