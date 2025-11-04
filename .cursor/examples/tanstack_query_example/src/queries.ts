import { useQuery } from "react-query";
import axios from "axios";

export type Post = {
  id: number;
  title: string;
};

export type PostDetailData = Post & {
  body: string;
};

const fetchPosts = (): Promise<Array<Post>> =>
  axios
    .get("https://jsonplaceholder.typicode.com/posts")
    .then((response) => response.data);

export const usePosts = () => useQuery(["posts", "list"], fetchPosts);

const fetchPost = (id: number): Promise<PostDetailData> =>
  axios
    .get(`https://jsonplaceholder.typicode.com/posts/${id}`)
    .then((response) => response.data);

export const usePost = (id: number) =>
  useQuery(["posts", "detail", id], () => fetchPost(id));
