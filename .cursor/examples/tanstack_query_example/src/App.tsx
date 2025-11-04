import * as React from "react";

import { QueryClient, QueryClientProvider, useQueryClient } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";

import { usePosts, usePost, PostDetailData, Post } from "./queries";

type InvalidateEvent = {
  operation: "invalidate";
  entity: Array<string>;
  id?: number;
};

type UpdateEvent = {
  operation: "update";
  entity: Array<string>;
  id: number;
  payload: Partial<PostDetailData>;
};

type WebSocketEvent = InvalidateEvent | UpdateEvent;

const useReactQuerySubscription = () => {
  const queryClient = useQueryClient();

  const websocket = React.useRef<WebSocket>();

  React.useEffect(() => {
    websocket.current = new WebSocket("wss://echo.websocket.org/");
    websocket.current.onmessage = (event) => {
      console.log("received event", event);
      try {
        const data: WebSocketEvent = JSON.parse(event.data);
        switch (data.operation) {
          case "invalidate":
            queryClient.invalidateQueries(
              [...data.entity, data.id].filter(Boolean)
            );
            break;
          case "update":
            queryClient.setQueriesData(data.entity, (oldData) => {
              const update = (entity: Record<string, unknown>) =>
                entity.id === data.id ? { ...entity, ...data.payload } : entity;
              return Array.isArray(oldData)
                ? oldData.map(update)
                : update(oldData as Record<string, unknown>);
            });
            break;
        }
      } catch (e) {
        // console.error(e);
      }
    };
    websocket.current.onopen = () => {
      console.log("connected");
    };

    return () => {
      websocket.current?.close();
    };
  }, [queryClient]);

  return (input: WebSocketEvent) => {
    websocket.current?.send(JSON.stringify(input));
  };
};

const Posts = ({ setPostId }: { setPostId: (id: number) => void }) => {
  const { isLoading, error, data } = usePosts();

  if (isLoading) return <div>Loading...</div>;

  if (error instanceof Error)
    return <div>An error has occurred: {error.message}</div>;

  return (
    <div>
      {data?.map((post) => (
        <p key={post.id}>
          <a onClick={() => setPostId(post.id)} href="#">
            {post.title}
          </a>
        </p>
      ))}
    </div>
  );
};

const PostDetail = ({
  postId,
  setPostId,
}: {
  postId: number;
  setPostId: (id: number) => void;
}) => {
  const { status, data, error } = usePost(postId);

  return (
    <div>
      <div>
        <a onClick={() => setPostId(-1)} href="#">
          Back
        </a>
      </div>
      {!postId || status === "loading" ? (
        "Loading..."
      ) : error instanceof Error ? (
        <span>Error: {error.message}</span>
      ) : (
        <>
          <h1>{data?.title}</h1>
          <div>
            <p>{data?.body}</p>
          </div>
        </>
      )}
    </div>
  );
};

const Example = () => {
  const [postId, setPostId] = React.useState(-1);

  const send = useReactQuerySubscription();

  return (
    <div>
      <button
        onClick={() =>
          send({ operation: "invalidate", entity: ["posts", "list"] })
        }
      >
        Invalidate Posts List
      </button>
      <button
        onClick={() =>
          send({
            operation: "update",
            entity: ["posts"],
            id: 5,
            payload: { title: "My 5th post" },
          })
        }
      >
        Set Post 5 title and body
      </button>
      {postId < 0 ? (
        <Posts setPostId={setPostId} />
      ) : (
        <PostDetail postId={postId} setPostId={setPostId} />
      )}
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
      <ReactQueryDevtools initialIsOpen />
    </QueryClientProvider>
  );
}
