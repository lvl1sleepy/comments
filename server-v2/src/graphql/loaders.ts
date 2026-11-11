import DataLoader from "dataloader";
import {
  findUsersByIds,
  type CommentAuthorRow,
} from "../repositories/user.repository.js";

// export function createAuthorLoader() {
//   return new DataLoader<string, CommentAuthorRow | null>(async (userIds) => {
//     const users = await findUsersByIds(userIds);

//     const userMap = new Map(users.map((user) => [user.id, user]));

//     return userIds.map((id) => userMap.get(id) ?? null);
//   });
// }
type FindAuthors = (userIds: readonly string[]) => Promise<CommentAuthorRow[]>;

export function createAuthorLoader(findAuthors: FindAuthors = findUsersByIds) {
  return new DataLoader<string, CommentAuthorRow | null>(async (userIds) => {
    const users = await findAuthors(userIds);

    const userMap = new Map(users.map((user) => [user.id, user]));

    return userIds.map((id) => userMap.get(id) ?? null);
  });
}
