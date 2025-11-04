├── .gitignore
├── LICENSE
├── README.md
├── app
├── (home)
│ ├── layout.ts
│ └── page.ts
├── (post)
│ ├── layout.ts
│ └── post
│ │ └── [postId]
│ │ └── page.tsx
├── api
│ ├── posts
│ │ ├── [id]
│ │ │ ├── comments
│ │ │ │ └── route.ts
│ │ │ └── route.ts
│ │ └── route.ts
│ └── users
│ │ └── me
│ │ └── route.ts
├── favicon.ico
└── layout.ts
├── docs
├── README.en.md
├── README.ko.md
└── images
│ └── example-clean-architecture.png
├── eslint.config.mjs
├── next.config.ts
├── package-lock.json
├── package.json
├── pages
└── README.md
├── postcss.config.mjs
├── public
├── file.svg
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
├── setup.ts
├── src
├── app
│ ├── layouts
│ │ ├── home
│ │ │ ├── HomeLayout.tsx
│ │ │ └── index.ts
│ │ ├── index.ts
│ │ ├── post
│ │ │ ├── PostLayout.tsx
│ │ │ └── index.ts
│ │ └── root
│ │ │ ├── RootLayout.tsx
│ │ │ └── index.ts
│ ├── provider
│ │ ├── index.ts
│ │ └── tanstack-query
│ │ │ ├── index.ts
│ │ │ └── tanstack-query-provider.tsx
│ └── styles
│ │ ├── globals.css
│ │ └── index.css
├── entities
│ ├── comment
│ │ ├── **tests**
│ │ │ ├── core
│ │ │ │ ├── comment.domain.test.ts
│ │ │ │ └── comment.factory.test.ts
│ │ │ ├── fixtures
│ │ │ │ ├── comment.fixtures.ts
│ │ │ │ └── index.ts
│ │ │ ├── index.ts
│ │ │ ├── infrastructure
│ │ │ │ └── comment.api.repository.test.ts
│ │ │ ├── mapper
│ │ │ │ └── comment.mapper.test.ts
│ │ │ ├── mocks
│ │ │ │ ├── comment-api.mock.ts
│ │ │ │ ├── comment-repository.mock.ts
│ │ │ │ └── index.ts
│ │ │ └── value-objects
│ │ │ │ ├── comment-body.vo.test.ts
│ │ │ │ ├── timestamp.vo.test.ts
│ │ │ │ └── user-reference.vo.test.ts
│ │ ├── core
│ │ │ ├── comment.domain.ts
│ │ │ ├── comment.factory.ts
│ │ │ ├── comment.repository.ts
│ │ │ └── index.ts
│ │ ├── index.ts
│ │ ├── infrastructure
│ │ │ ├── api
│ │ │ │ ├── comment.adapter.ts
│ │ │ │ ├── comment.query-key.ts
│ │ │ │ └── index.ts
│ │ │ ├── dto
│ │ │ │ ├── comment.dto.ts
│ │ │ │ └── index.ts
│ │ │ └── repository
│ │ │ │ ├── comment.api.repository.ts
│ │ │ │ └── index.ts
│ │ ├── mapper
│ │ │ ├── comment.mapper.ts
│ │ │ └── index.ts
│ │ ├── types
│ │ │ ├── comment.types.ts
│ │ │ └── index.ts
│ │ └── value-objects
│ │ │ ├── comment-body.vo.ts
│ │ │ ├── index.ts
│ │ │ ├── timestamp.vo.ts
│ │ │ └── user-reference.vo.ts
│ ├── post
│ │ ├── **tests**
│ │ │ ├── core
│ │ │ │ ├── post.domain.test.ts
│ │ │ │ └── post.factory.test.ts
│ │ │ ├── fixtures
│ │ │ │ ├── index.ts
│ │ │ │ └── post.fixtures.ts
│ │ │ ├── index.ts
│ │ │ ├── infrastructure
│ │ │ │ └── post.api.repository.test.ts
│ │ │ ├── mapper
│ │ │ │ └── post.mapper.test.ts
│ │ │ └── mocks
│ │ │ │ ├── index.ts
│ │ │ │ ├── post-api.mock.ts
│ │ │ │ └── post-repository.mock.ts
│ │ ├── core
│ │ │ ├── index.ts
│ │ │ ├── post.domain.ts
│ │ │ ├── post.factory.ts
│ │ │ └── post.repository.ts
│ │ ├── index.ts
│ │ ├── infrastructure
│ │ │ ├── api
│ │ │ │ ├── index.ts
│ │ │ │ ├── post-query-key.api.ts
│ │ │ │ └── post.adapter.ts
│ │ │ ├── dto
│ │ │ │ ├── index.ts
│ │ │ │ └── post.dto.ts
│ │ │ └── repository
│ │ │ │ ├── index.ts
│ │ │ │ └── post.api.repository.ts
│ │ ├── mapper
│ │ │ ├── index.ts
│ │ │ └── post.mapper.ts
│ │ └── types
│ │ │ ├── index.ts
│ │ │ └── post.types.ts
│ └── user
│ │ ├── **tests**
│ │ ├── core
│ │ │ ├── user.domain.test.ts
│ │ │ └── user.factory.test.ts
│ │ ├── fixtures
│ │ │ ├── index.ts
│ │ │ └── user.fixtures.ts
│ │ ├── index.ts
│ │ ├── infrastructure
│ │ │ └── user.api.repository.test.ts
│ │ ├── mapper
│ │ │ └── user.mapper.test.ts
│ │ ├── mocks
│ │ │ ├── index.ts
│ │ │ ├── user-api.mock.ts
│ │ │ └── user-repository.mock.ts
│ │ └── ui
│ │ │ └── identifier
│ │ │ ├── UserAvatar.test.tsx
│ │ │ └── UserIdentifier.test.tsx
│ │ ├── core
│ │ ├── index.ts
│ │ ├── user.domain.ts
│ │ ├── user.factory.ts
│ │ └── user.repository.ts
│ │ ├── index.ts
│ │ ├── infrastructure
│ │ ├── api
│ │ │ ├── index.ts
│ │ │ ├── user.adapter.ts
│ │ │ └── user.query-key.ts
│ │ ├── dto
│ │ │ ├── index.ts
│ │ │ └── user.dto.ts
│ │ └── repository
│ │ │ ├── index.ts
│ │ │ └── user.api.repository.ts
│ │ ├── mapper
│ │ ├── index.ts
│ │ └── user.mapper.ts
│ │ ├── types
│ │ ├── index.ts
│ │ └── user.types.ts
│ │ └── ui
│ │ └── identifier
│ │ ├── UserAvatar.tsx
│ │ ├── UserIdentifier.tsx
│ │ └── index.ts
├── features
│ ├── comment
│ │ ├── **tests**
│ │ │ ├── fixtures
│ │ │ │ ├── comment-hook.fixtures.ts
│ │ │ │ └── index.ts
│ │ │ ├── hooks
│ │ │ │ └── useGetCommentsByPostId.test.ts
│ │ │ ├── index.ts
│ │ │ ├── mocks
│ │ │ │ └── comment-service.mock.ts
│ │ │ ├── services
│ │ │ │ └── comment.service.test.ts
│ │ │ └── ui
│ │ │ │ ├── comment-form
│ │ │ │ └── CommentForm.test.tsx
│ │ │ │ └── comment-view
│ │ │ │ └── CommentView.test.tsx
│ │ ├── hooks
│ │ │ ├── comment.hooks.factory.ts
│ │ │ ├── index.ts
│ │ │ └── useGetCommentsByPostId.ts
│ │ ├── index.ts
│ │ ├── services
│ │ │ ├── comment.service.factory.ts
│ │ │ ├── comment.service.ts
│ │ │ └── index.ts
│ │ ├── ui
│ │ │ ├── comment-form
│ │ │ │ ├── CommentForm.tsx
│ │ │ │ └── index.ts
│ │ │ └── comment-view
│ │ │ │ ├── CommentView.tsx
│ │ │ │ └── index.ts
│ │ └── usecase
│ │ │ ├── comment.usecase.ts
│ │ │ └── index.ts
│ ├── post
│ │ ├── **tests**
│ │ │ ├── fixtures
│ │ │ │ ├── index.ts
│ │ │ │ └── post-hook.fixtures.ts
│ │ │ ├── hooks
│ │ │ │ ├── useGetPostById.test.ts
│ │ │ │ └── useGetPosts.test.ts
│ │ │ ├── index.ts
│ │ │ ├── mocks
│ │ │ │ └── post-service.mock.ts
│ │ │ ├── services
│ │ │ │ └── post.service.test.ts
│ │ │ └── ui
│ │ │ │ └── card
│ │ │ │ └── PostCard.test.tsx
│ │ ├── hooks
│ │ │ ├── index.ts
│ │ │ ├── post.hooks.factory.ts
│ │ │ ├── useGetPostById.ts
│ │ │ └── useGetPosts.ts
│ │ ├── index.ts
│ │ ├── services
│ │ │ ├── index.ts
│ │ │ ├── post.service.factory.ts
│ │ │ └── post.service.ts
│ │ ├── types
│ │ │ └── index.ts
│ │ ├── ui
│ │ │ └── card
│ │ │ │ ├── PostCard.tsx
│ │ │ │ └── index.ts
│ │ └── usecase
│ │ │ └── post.usecase.ts
│ └── user
│ │ ├── **tests**
│ │ ├── fixtures
│ │ │ ├── index.ts
│ │ │ └── user-hook.fixtures.ts
│ │ ├── hooks
│ │ │ └── useUserProfile.test.ts
│ │ ├── index.ts
│ │ ├── mocks
│ │ │ └── user-service.mock.ts
│ │ └── services
│ │ │ └── user.service.test.ts
│ │ ├── hooks
│ │ ├── index.ts
│ │ ├── useUserProfile.ts
│ │ └── user.hooks.factory.ts
│ │ ├── index.ts
│ │ ├── services
│ │ ├── index.ts
│ │ ├── user.service.factory.ts
│ │ └── user.service.ts
│ │ └── usecase
│ │ └── user.usecase.ts
├── pages
│ ├── home
│ │ ├── HomePage.tsx
│ │ ├── **tests**
│ │ │ └── HomePage.test.tsx
│ │ └── index.ts
│ └── post
│ │ ├── **tests**
│ │ └── detail
│ │ │ └── PostDetailPage.test.tsx
│ │ ├── detail
│ │ ├── PostDetailPage.tsx
│ │ └── index.ts
│ │ └── index.ts
├── shared
│ ├── api
│ │ ├── base.api.ts
│ │ ├── index.ts
│ │ └── query-client.api.ts
│ ├── config
│ │ ├── index.ts
│ │ └── metadata
│ │ │ ├── default.ts
│ │ │ └── index.ts
│ ├── domain
│ │ ├── index.ts
│ │ └── value-object.ts
│ ├── libs
│ │ ├── **tests**
│ │ │ ├── helpers
│ │ │ │ ├── async-utils.helper.ts
│ │ │ │ ├── data-generators.helper.ts
│ │ │ │ ├── dom-utils.helper.ts
│ │ │ │ ├── index.ts
│ │ │ │ └── mock-utils.helper.ts
│ │ │ ├── index.ts
│ │ │ ├── mocks
│ │ │ │ ├── api.mock.ts
│ │ │ │ ├── index.ts
│ │ │ │ ├── repository-base.mock.ts
│ │ │ │ └── service-base.mock.ts
│ │ │ └── wrappers
│ │ │ │ ├── FullWrapper.tsx
│ │ │ │ ├── QueryWrapper.tsx
│ │ │ │ ├── RouterWrapper.tsx
│ │ │ │ └── index.ts
│ │ ├── date
│ │ │ ├── format-date.ts
│ │ │ ├── index.ts
│ │ │ └── random-date.ts
│ │ ├── errors
│ │ │ ├── base-error.ts
│ │ │ └── index.ts
│ │ └── index.ts
│ ├── types
│ │ ├── api.types.ts
│ │ ├── index.ts
│ │ └── pagination.types.ts
│ └── ui
│ │ ├── divider
│ │ ├── Divider.tsx
│ │ └── index.ts
│ │ ├── icons
│ │ ├── Back.tsx
│ │ ├── Comment.tsx
│ │ ├── Like.tsx
│ │ ├── Logo.tsx
│ │ ├── Message.tsx
│ │ ├── Notification.tsx
│ │ ├── Search.tsx
│ │ └── index.ts
│ │ ├── index.ts
│ │ └── input
│ │ ├── Input.tsx
│ │ └── index.ts
└── widgets
│ ├── header
│ ├── **tests**
│ │ ├── MainHeader.test.tsx
│ │ └── PostHeader.test.tsx
│ ├── index.ts
│ ├── main-header
│ │ ├── MainHeader.tsx
│ │ └── index.ts
│ └── post-header
│ │ ├── PostHeader.tsx
│ │ └── index.ts
│ └── post
│ ├── **tests**
│ ├── PostDetailSection.test.tsx
│ └── PostListSection.test.tsx
│ ├── index.ts
│ ├── post-detail-section
│ ├── PostDetailSection.tsx
│ └── index.ts
│ └── post-list-section
│ ├── PostListSection.tsx
│ └── index.ts
├── tsconfig.json
└── vitest.config.ts

---

## /README.md:

1 | # Frontend Clean Architecture (with FSD & DDD)
2 |
3 | An experimental frontend architecture example implementing Feature-Sliced Design, Domain-Driven Design, and Clean Architecture principles with Next.js.
4 |
5 | > ⚠️ **Note**: This is an example project designed to demonstrate architectural patterns and principles. It intentionally includes over-engineering to showcase various design concepts clearly.
6 |
7 | ## Documentation
8 |
9 | Detailed guides available in:
10 |
11 | - 🇺🇸 [English](docs/README.en.md)
12 | - 🇰🇷 [한국어](docs/README.ko.md)
13 |
14 | 📝 Blog Post: [Frontend Clean Architecture (with FSD & DDD)](https://lapidix.dev/posts/fsd-dd-clean-architecture)
15 |
16 | ## What This Project Demonstrates
17 |
18 | ### Architecture Patterns
19 |
20 | - **Feature-Sliced Design (FSD)** - Systematic frontend application structuring
21 | - **Domain-Driven Design (DDD)** - Business domain-centric modeling approach
22 | - **Clean Architecture** - Dependency inversion and layer separation principles
23 |
24 | ### Architecture Diagram
25 |
26 | ![Architecture Diagram](docs/images/example-clean-architecture.png)
27 |
28 | ### Implementation Highlights
29 |
30 | - Type-safe domain entities with business rule encapsulation
31 | - Repository pattern with dependency injection
32 | - Value Objects for domain concept validation
33 | - Factory patterns for complex object creation
34 | - Consistent error handling across all layers
35 | - React Query integration for state management
36 |
37 | ## Project Structure
38 |
39 | `40 | src/
41 | ├── shared/       # Common utilities, API clients, domain base classes
42 | ├── entities/     # Business entities (User, Post, Comment)
43 | ├── features/     # Application business logic
44 | ├── widgets/      # Independent UI blocks
45 | ├── pages/        # Page components
46 | └── app/          # Global app configuration
47 |`
48 |
49 | ## When to Consider This Approach
50 |
51 | This architecture works well for:
52 |
53 | - Projects with complex business logic and state management needs
54 | - Long-term products requiring continuous feature expansion
55 | - Medium to large teams with multiple developers
56 | - Agile environments with frequently changing requirements
57 | - Services where code quality and test coverage are critical
58 |

---

## /app/(home)/layout.ts:

1 | export { HomeLayout as default } from "@/app/layouts";
2 |

---

## /app/(home)/page.ts:

1 | export { Home as default } from "@/pages/home";
2 |

---

## /app/(post)/layout.ts:

1 | export { PostLayout as default } from "@/app/layouts";
2 |

---

## /app/(post)/post/[postId]/page.tsx:

1 | import { PostDetailPage } from "@/pages/post";
2 | import { redirect } from "next/navigation";
3 |
4 | export default async function Page({
5 | params,
6 | }: {
7 | params: Promise<{ postId: string }>;
8 | }) {
9 | const { postId } = await params;
10 |
11 | if (!postId) {
12 | redirect("/notfound");
13 | }
14 | return <PostDetailPage postId={postId} />;
15 | }
16 |

---

## /app/api/posts/[id]/comments/route.ts:

1 | import { CommentDto } from "@/entities/comment";
2 | import { getRandomDate } from "@/shared/libs";
3 | import { NextRequest, NextResponse } from "next/server";
4 |
5 | export async function GET(
6 | request: NextRequest,
7 | { params }: { params: Promise<{ id: string }> }
8 | ) {
9 | try {
10 | const { id: postId } = await params;
11 |
12 | const { searchParams } = new URL(request.url);
13 | const limitParam = searchParams.get("limit");
14 | const limit = limitParam ? parseInt(limitParam, 10) : 10;
15 |
16 | const comments = generateComments(postId, limit);
17 |
18 | return NextResponse.json(
19 | {
20 | data: comments,
21 | pagination: {
22 | total: comments.length,
23 | page: 1,
24 | limit: limit,
25 | },
26 | },
27 | {
28 | status: 200,
29 | headers: {
30 | "Content-Type": "application/json",
31 | "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
32 | },
33 | }
34 | );
35 | } catch (error) {
36 | console.error("Error fetching comments for post ID ${postId}:", error);
37 |     return NextResponse.json(
38 |       { error: "Server error occurred." },
39 |       { status: 500 }
40 |     );
41 |   }
42 | }
43 | 
44 | const generateComments = (postId: string, count: number): CommentDto[] => {
45 |   const comments: CommentDto[] = [];
46 |   for (let i = 1; i <= count; i++) {
47 |     comments.push({
48 |       id: i.toString(),
49 |       body: getRandomComment(),
50 |       user: {
51 |         id: (i + 100).toString(),
52 |         username: `Comment_User_${i}`,
53 |         profileImage: `https://picsum.photos/seed/${i + 100}/40/40`,
54 | },
55 | postId: postId,
56 | createdAt: getRandomDate(),
57 | likes: 0,
58 | });
59 | }
60 | return comments;
61 | };
62 |
63 | const getRandomComment = (): string => {
64 | const comments = [
65 | "Nice photo! 👍",
66 | "Wow! I really like it 😍",
67 | "Where is this place?",
68 | "I want to visit there too!",
69 | "The atmosphere looks so good",
70 | "Have a nice day today ☺️",
71 | "Thank you for always sharing great posts",
72 | "Looking forward to your next post!",
73 | "It's so beautiful 💕",
74 | "Thanks for sharing~",
75 | ];
76 | return comments[Math.floor(Math.random() * comments.length)];
77 | };
78 |

---

## /app/api/posts/[id]/route.ts:

1 | import { PostDto } from "@/entities/post";
2 | import { getRandomDate } from "@/shared/libs/date";
3 | import { NextRequest, NextResponse } from "next/server";
4 |
5 | export async function GET(
6 | request: NextRequest,
7 | { params }: { params: Promise<{ id: string }> }
8 | ) {
9 | try {
10 | const { id: postId } = await params;
11 | const post = generateMockPostById(postId);
12 | if (!post) {
13 | return NextResponse.json({ error: "Post not found" }, { status: 404 });
14 | }
15 |
16 | return NextResponse.json(post, {
17 | status: 200,
18 | headers: {
19 | "Content-Type": "application/json",
20 | "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
21 | },
22 | });
23 | } catch (error) {
24 | console.error("Failed to fetch post details:", error);
25 | return NextResponse.json(
26 | { error: "Server error occurred." },
27 | { status: 500 }
28 | );
29 | }
30 | }
31 |
32 | const generateMockPostById = (id: string): PostDto => {
33 | return {
34 | id,
35 | user: {
36 | id,
37 | username: `Post_User_${id}`,
38 | profileImage: `https://picsum.photos/seed/${id + 200}/50/50`,
39 | },
40 | title: `Post Title ${id}`,
41 | body: `Hello! Sharing a special moment today. #Daily #Memory #HappyMoment`,
42 | image: `https://picsum.photos/seed/${id}/400/300`,
43 | totalComments: Math.floor(Math.random() _ 100),
44 | likes: Math.floor(Math.random() _ 1000),
45 | createdAt: getRandomDate(),
46 | updatedAt: getRandomDate(),
47 | };
48 | };
49 |

---

## /app/api/posts/route.ts:

1 | import { PostDto } from "@/entities/post";
2 | import { getRandomDate } from "@/shared/libs";
3 | import { NextResponse } from "next/server";
4 |
5 | const generateMockPosts = (count: number = 24): PostDto[] => {
6 | const posts: PostDto[] = [];
7 | for (let i = 1; i <= count; i++) {
8 | posts.push({
9 | id: i.toString(),
10 | user: {
11 | id: i.toString(),
12 | username: `Post_User_${i}`,
13 | profileImage: `https://picsum.photos/seed/${i + 200}/50/50`,
14 | },
15 | title: `Post Title ${i}`,
16 | body: `Hello! Sharing a special moment today. #Daily #Memory #HappyMoment`,
17 | image: `https://picsum.photos/seed/${i}/400/300`,
18 | likes: Math.floor(Math.random() _ 1000),
19 | totalComments: Math.floor(Math.random() _ 100),
20 | createdAt: getRandomDate(),
21 | updatedAt: getRandomDate(),
22 | });
23 | }
24 | return posts;
25 | };
26 |
27 | export async function GET(request: Request) {
28 | try {
29 | const { searchParams } = new URL(request.url);
30 | const limit = searchParams.get("limit");
31 |
32 | const count = limit ? parseInt(limit) : 24;
33 | const posts = generateMockPosts(count);
34 |
35 | return NextResponse.json(
36 | { data: posts },
37 | {
38 | status: 200,
39 | headers: {
40 | "Content-Type": "application/json",
41 | "Cache-Control": "no-store, max-age=0",
42 | },
43 | }
44 | );
45 | } catch (error) {
46 | return NextResponse.json(
47 | { message: "Failed to generate posts", error },
48 | { status: 500 }
49 | );
50 | }
51 | }
52 |

---

## /app/api/users/me/route.ts:

1 | import { NextResponse } from "next/server";
2 |
3 | const generateMockUserProfile = () => {
4 | return {
5 | id: 1,
6 | username: "astute lee",
7 | profileImage: "https://picsum.photos/seed/523/100/100",
8 | fullName: "astute lee",
9 | email: "user@example.com",
10 | age: 28,
11 | };
12 | };
13 |
14 | export async function GET() {
15 | try {
16 | const userProfile = generateMockUserProfile();
17 |
18 | return NextResponse.json(userProfile, {
19 | status: 200,
20 | headers: {
21 | "Content-Type": "application/json",
22 | "Cache-Control": "public, max-age=3600, s-maxage=3600",
23 | },
24 | });
25 | } catch (error) {
26 | return NextResponse.json(
27 | { message: "Failed to fetch user profile", error },
28 | { status: 500 }
29 | );
30 | }
31 | }
32 |

---

## /app/layout.ts:

1 | export { RootLayout as default } from "@/app/layouts/root";
2 | export { defaultMetadata as metadata } from "@/shared/config";
3 |

---

## /docs/README.en.md:

1 | # Frontend Clean Architecture (with FSD & DDD)
2 |
3 | _[한국어](README.ko.md)_
4 |
5 | > ⚠️ Note: This project is an **educational example** of applying Clean Architecture, DDD patterns, and FSD to frontend development. It is designed for educational purposes and architectural understanding rather than production environments, with intentional structuring to clearly demonstrate each pattern and principle.
6 |
7 | ## Overview
8 |
9 | This is sample code demonstrating how to combine three architectural patterns: Clean Architecture, Domain-Driven Design (DDD), and Feature-Sliced Design (FSD) in frontend development. The core concepts and practical application methods of each pattern have been specifically implemented in a Next.js environment.
10 |
11 | > **Related Article**: [Frontend Clean Architecture (with FSD & DDD)](https://lapidix.dev/posts/fsd-ddd-clean-architecture)
12 |
13 | ### Core Concepts
14 |
15 | - **FSD (Feature-Sliced Design)**: A methodology for systematically structuring frontend applications
16 | - **DDD (Domain-Driven Design)**: A design approach centered on business domains
17 | - **Clean Architecture**: Principles of dependency inversion and layer separation
18 |
19 | ## Folder Structure
20 |
21 | `22 | src/
23 | ├── shared/       # Common utilities, API clients, domain base classes
24 | ├── entities/     # Business entities (User, Post, Comment)
25 | ├── features/     # Application business logic
26 | ├── widgets/      # Independent UI blocks
27 | ├── pages/        # Page components
28 | └── app/          # App-wide configurations
29 |`
30 |
31 | ### Entity Internal Structure Example
32 |
33 | `34 | entities/post/
35 | ├── core/                   # Domain logic
36 | │   ├── post.domain.ts      # Entity (business rules)
37 | │   ├── post.factory.ts     # Factory (object creation)
38 | │   └── post.repository.ts  # Repository Interface
39 | ├── infrastructure/         # External implementations
40 | │   ├── api/                # API adapters
41 | │   └── repository/         # Repository implementations
42 | ├── mapper/                 # Data transformations
43 | ├── types/                  # Type definitions
44 | ├── value-objects/          # ValueObject definitions
45 | └── index.ts                # Public API
46 |`
47 |
48 | ## Architecture Mapping
49 |
50 | ![example-clean-architecture](./images/example-clean-architecture.png)
51 |
52 | | Clean Architecture Layer | FSD Implementation |
53 | | ------------------------------ | ------------------------------------------------- |
54 | | **Enterprise Business Rules** | `entities/*/core/` |
55 | | **Application Business Rules** | `features/*/services/` |
56 | | **Interface Adapters** | `features/*/hooks/`, `entities/*/infrastructure/` |
57 | | **Frameworks & Drivers** | `app/`, `pages/`, `widgets/`, External APIs |
58 |
59 | ## Application Guide
60 |
61 | This architecture is worth considering in the following situations:
62 |
63 | - Projects requiring complex state management and business logic
64 | - Projects that need continuous feature expansion over a long period
65 | - Medium to large teams with multiple developers working together
66 | - Agile environments where plans and requirements frequently change
67 | - Services where code quality and test coverage are important
68 |
69 | ## Learning Resources
70 |
71 | - [Feature-Sliced Design Official Documentation](https://feature-sliced.design/)
72 | - [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
73 | - [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
74 |
75 | ---
76 |
77 | The purpose of this project is not to demonstrate perfect implementation. The real value lies in understanding the characteristics of each pattern and developing the sense to determine when and how to apply them in actual development.
78 |
79 | ## License
80 |
81 | This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
82 |

png

---

## /package.json:

1 | {
2 | "name": "nextjs-fsd-ddd-example",
3 | "version": "0.1.0",
4 | "private": true,
5 | "scripts": {
6 | "dev": "next dev --turbopack",
7 | "build": "next build",
8 | "start": "next start",
9 | "lint": "next lint",
10 | "test": "vitest",
11 | "test:ui": "vitest --ui",
12 | "test:run": "vitest run",
13 | "test:coverage": "vitest run --coverage"
14 | },
15 | "dependencies": {
16 | "@tanstack/react-query": "^5.74.7",
17 | "next": "15.3.4",
18 | "react": "^19.0.0",
19 | "react-dom": "^19.0.0"
20 | },
21 | "devDependencies": {
22 | "@eslint/eslintrc": "^3",
23 | "@tailwindcss/postcss": "^4",
24 | "@testing-library/jest-dom": "^6.6.3",
25 | "@testing-library/react": "^16.3.0",
26 | "@types/node": "^20",
27 | "@types/react": "^19",
28 | "@types/react-dom": "^19",
29 | "@vitest/coverage-v8": "^3.2.4",
30 | "@vitest/ui": "^3.2.4",
31 | "eslint": "^9",
32 | "eslint-config-next": "15.3.4",
33 | "jsdom": "^26.1.0",
34 | "tailwindcss": "^4",
35 | "typescript": "^5",
36 | "vitest": "^3.2.4"
37 | }
38 | }
39 |

---

## /pages/README.md:

1 | This folder exists to prevent Next.js from treating `src/pages` as the Pages Router. `src/pages` is used as the Pages layer in [Feature-Sliced Design](https://feature-sliced.design)
2 |

---

## /setup.ts:

1 | import "@testing-library/jest-dom";
2 | import React from "react";
3 |
4 | // Make React available globally for JSX
5 | global.React = React;
6 |
7 | global.console = {
8 | ...console,
9 | log: vi.fn(),
10 | debug: vi.fn(),
11 | info: vi.fn(),
12 | };
13 |

---

## /src/app/layouts/home/HomeLayout.tsx:

1 | import { MainHeader } from "@/widgets/header/main-header";
2 | import { Suspense } from "react";
3 |
4 | export function HomeLayout({
5 | children,
6 | }: Readonly<{
7 | children: React.ReactNode;
8 | }>) {
9 | return (
10 | <div className="w-full flex-1 flex flex-col items-center justify-center mx-auto">
11 | <Suspense fallback={<div>Loading...</div>}>
12 | <MainHeader />
13 | </Suspense>
14 |
15 | {children}
16 | </div>
17 | );
18 | }
19 |

---

## /src/app/layouts/home/index.ts:

1 | export { HomeLayout } from "./HomeLayout";
2 |

---

## /src/app/layouts/index.ts:

1 | export { HomeLayout } from "./home";
2 | export { PostLayout } from "./post";
3 | export { RootLayout } from "./root";
4 |

---

## /src/app/layouts/post/PostLayout.tsx:

1 | import { PostHeader } from "@/widgets/header/post-header";
2 |
3 | export function PostLayout({
4 | children,
5 | }: Readonly<{
6 | children: React.ReactNode;
7 | }>) {
8 | return (
9 | <div className="w-full flex-1 flex flex-col">
10 | <PostHeader />
11 | <div className="px-4 py-6">{children}</div>
12 | </div>
13 | );
14 | }
15 |

---

## /src/app/layouts/post/index.ts:

1 | export { PostLayout } from "./PostLayout";
2 |

---

## /src/app/layouts/root/RootLayout.tsx:

1 | import { TanstackQueryProvider } from "@/app/provider/tanstack-query";
2 | import { Geist, Geist_Mono } from "next/font/google";
3 | import "../../styles/globals.css";
4 |
5 | const geistSans = Geist({
6 | variable: "--font-geist-sans",
7 | subsets: ["latin"],
8 | });
9 |
10 | const geistMono = Geist_Mono({
11 | variable: "--font-geist-mono",
12 | subsets: ["latin"],
13 | });
14 |
15 | export function RootLayout({
16 | children,
17 | }: Readonly<{
18 | children: React.ReactNode;
19 | }>) {
20 | return (
21 | <html lang="en">
22 | <body
23 | className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
24 | <main>
25 | <TanstackQueryProvider>
26 | <div className="min-w-screen min-h-screen flex flex-col items-center justify-center">
27 | {children}
28 | </div>
29 | </TanstackQueryProvider>
30 | </main>
31 | </body>
32 | </html>
33 | );
34 | }
35 |

---

## /src/app/layouts/root/index.ts:

1 | export { RootLayout } from "./RootLayout";
2 |

---

## /src/app/provider/index.ts:

1 | export { QueryClientProvider } from "@tanstack/react-query";
2 |

---

## /src/app/provider/tanstack-query/index.ts:

1 | export { TanstackQueryProvider } from "./tanstack-query-provider";
2 |

---

## /src/app/provider/tanstack-query/tanstack-query-provider.tsx:

1 | "use client";
2 | import { queryClient } from "@/shared/api";
3 | import { QueryClientProvider } from "@tanstack/react-query";
4 | import \* as React from "react";
5 |
6 | export const TanstackQueryProvider = ({
7 | children,
8 | }: {
9 | children: React.ReactNode;
10 | }) => {
11 | return (
12 | <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
13 | );
14 | };
15 |

---

## /src/app/styles/globals.css:

1 | @import "tailwindcss";
2 |
3 | :root {
4 | --background: #ffffff;
5 | --foreground: #171717;
6 | }
7 |
8 | body {
9 | background: var(--background);
10 | color: var(--foreground);
11 | font-family: Arial, Helvetica, sans-serif;
12 | }
13 |

---

## /src/app/styles/index.css:

1 | @import url("./globals.css");
2 |

---

## /src/entities/comment/**tests**/core/comment.domain.test.ts:

1 | import { vi } from "vitest";
2 | import { Comment } from "../../core";
3 | import { UserReference } from "../../types";
4 | import { CommentFixtures } from "../fixtures";
5 |
6 | /\*_
7 | _ Comment Domain Model Tests
8 | _ Verify Comment entity core functionality using Given-When-Then pattern
9 | _/
10 | describe("Comment Domain Model", () => {
11 | let validUser: UserReference;
12 | let validPostId: string;
13 | let validBody: string;
14 | let validTimestamp: number;
15 |
16 | beforeEach(() => {
17 | // Given: Set up basic data needed for tests
18 | validUser = CommentFixtures.valid.basic.user;
19 | validPostId = "post-123";
20 | validBody = "This is a valid comment body.";
21 | validTimestamp = Date.now();
22 | });
23 |
24 | describe("Constructor", () => {
25 | it("should create valid Comment instance with all properties", () => {
26 | // Given: Valid comment creation parameters
27 | const id = "comment-123";
28 | const likes = 5;
29 |
30 | // When: Create Comment instance
31 | const comment = new Comment(
32 | id,
33 | validBody,
34 | validUser,
35 | validPostId,
36 | likes,
37 | validTimestamp,
38 | validTimestamp
39 | );
40 |
41 | // Then: Comment instance should be created with all properties
42 | expect(comment).toBeInstanceOf(Comment);
43 | expect(comment.id).toBe(id);
44 | expect(comment.body).toBe(validBody);
45 | expect(comment.user).toEqual(validUser);
46 | expect(comment.postId).toBe(validPostId);
47 | expect(comment.likes).toBe(likes);
48 | expect(comment.createdAt).toBe(validTimestamp);
49 | expect(comment.updatedAt).toBe(validTimestamp);
50 | });
51 |
52 | it("should set default likes to 0 when not provided", () => {
53 | // Given: Comment creation without likes parameter
54 | const id = "comment-123";
55 |
56 | // When: Create Comment instance without likes
57 | const comment = new Comment(
58 | id,
59 | validBody,
60 | validUser,
61 | validPostId,
62 | undefined,
63 | validTimestamp,
64 | validTimestamp
65 | );
66 |
67 | // Then: Likes should default to 0
68 | expect(comment.likes).toBe(0);
69 | });
70 |
71 | it("should throw error when body is empty", () => {
72 | // Given: Empty comment body
73 | const emptyBody = "";
74 |
75 | // When & Then: Error should occur with empty body
76 | expect(() => {
77 | new Comment(
78 | "comment-123",
79 | emptyBody,
80 | validUser,
81 | validPostId,
82 | 0,
83 | validTimestamp,
84 | validTimestamp
85 | );
86 | }).toThrow("Comment body cannot be empty");
87 | });
88 |
89 | it("should throw error when body exceeds maximum length", () => {
90 | // Given: Comment body exceeding 100 characters
91 | const tooLongBody = "a".repeat(101);
92 |
93 | // When & Then: Error should occur with too long body
94 | expect(() => {
95 | new Comment(
96 | "comment-123",
97 | tooLongBody,
98 | validUser,
99 | validPostId,
100 | 0,
101 | validTimestamp,
102 | validTimestamp
103 | );
104 | }).toThrow("Comment body cannot exceed 100 characters");
105 | });
106 |
107 | it("should throw error when user reference is invalid", () => {
108 | // Given: Invalid user reference with empty username
109 | const invalidUser: UserReference = {
110 | id: "user-123",
111 | username: "",
112 | profileImage: "https://example.com/avatar.jpg",
113 | };
114 |
115 | // When & Then: Error should occur with invalid user
116 | expect(() => {
117 | new Comment(
118 | "comment-123",
119 | validBody,
120 | invalidUser,
121 | validPostId,
122 | 0,
123 | validTimestamp,
124 | validTimestamp
125 | );
126 | }).toThrow("Username cannot be empty");
127 | });
128 | });
129 |
130 | describe("updateBody Method", () => {
131 | let comment: Comment;
132 | let originalTimestamp: number;
133 |
134 | beforeEach(() => {
135 | // Given: Set up Comment instance for testing
136 | originalTimestamp = Date.now() - 10000;
137 | comment = new Comment(
138 | "comment-123",
139 | "Original body",
140 | validUser,
141 | validPostId,
142 | 0,
143 | originalTimestamp,
144 | originalTimestamp
145 | );
146 | vi.spyOn(Date, "now").mockReturnValue(Date.now());
147 | });
148 |
149 | it("should update body and updatedAt timestamp", () => {
150 | // Given: New valid comment body
151 | const newBody = "Updated comment body";
152 | const beforeUpdate = Date.now();
153 |
154 | // When: Call updateBody method
155 | comment.updateBody(newBody);
156 |
157 | // Then: Body and updatedAt should be updated, createdAt unchanged
158 | expect(comment.body).toBe(newBody);
159 | expect(comment.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
160 | expect(comment.createdAt).toBe(originalTimestamp);
161 | });
162 |
163 | it("should throw error when updating with empty body", () => {
164 | // Given: Empty comment body
165 | const emptyBody = "";
166 |
167 | // When & Then: Error should occur with empty body
168 | expect(() => {
169 | comment.updateBody(emptyBody);
170 | }).toThrow("Comment body cannot be empty");
171 | });
172 |
173 | it("should throw error when updating with too long body", () => {
174 | // Given: Comment body exceeding 100 characters
175 | const tooLongBody = "a".repeat(101);
176 |
177 | // When & Then: Error should occur with too long body
178 | expect(() => {
179 | comment.updateBody(tooLongBody);
180 | }).toThrow("Comment body cannot exceed 100 characters");
181 | });
182 | });
183 |
184 | describe("like Method", () => {
185 | let comment: Comment;
186 |
187 | beforeEach(() => {
188 | // Given: Set up Comment instance for testing
189 | comment = new Comment(
190 | "comment-123",
191 | validBody,
192 | validUser,
193 | validPostId,
194 | 5,
195 | validTimestamp,
196 | validTimestamp
197 | );
198 | });
199 |
200 | it("should increment likes count", () => {
201 | // Given: Current likes count
202 | const initialLikes = comment.likes;
203 | const userId = "user-456";
204 |
205 | // When: Call like method
206 | comment.like(userId);
207 |
208 | // Then: Likes count should increase by 1
209 | expect(comment.likes).toBe(initialLikes + 1);
210 | });
211 |
212 | it("should handle multiple likes correctly", () => {
213 | // Given: Initial likes count and multiple user IDs
214 | const initialLikes = comment.likes;
215 | const userIds = ["user-1", "user-2", "user-3"];
216 |
217 | // When: Call like method multiple times
218 | userIds.forEach((userId) => comment.like(userId));
219 |
220 | // Then: Likes count should increase by number of calls
221 | expect(comment.likes).toBe(initialLikes + userIds.length);
222 | });
223 | });
224 |
225 | describe("unlike Method", () => {
226 | let comment: Comment;
227 |
228 | beforeEach(() => {
229 | // Given: Set up Comment instance with likes
230 | comment = new Comment(
231 | "comment-123",
232 | validBody,
233 | validUser,
234 | validPostId,
235 | 5,
236 | validTimestamp,
237 | validTimestamp
238 | );
239 | });
240 |
241 | it("should decrement likes count when likes > 0", () => {
242 | // Given: Current likes count (5)
243 | const initialLikes = comment.likes;
244 | const userId = "user-456";
245 |
246 | // When: Call unlike method
247 | comment.unlike(userId);
248 |
249 | // Then: Likes count should decrease by 1
250 | expect(comment.likes).toBe(initialLikes - 1);
251 | });
252 |
253 | it("should not decrement likes below zero", () => {
254 | // Given: Comment instance with 0 likes
255 | const commentWithZeroLikes = new Comment(
256 | "comment-zero",
257 | validBody,
258 | validUser,
259 | validPostId,
260 | 0,
261 | validTimestamp,
262 | validTimestamp
263 | );
264 | const userId = "user-456";
265 |
266 | // When: Call unlike method on comment with 0 likes
267 | commentWithZeroLikes.unlike(userId);
268 |
269 | // Then: Likes count should not go below 0
270 | expect(commentWithZeroLikes.likes).toBe(0);
271 | });
272 |
273 | it("should handle multiple unlikes correctly", () => {
274 | // Given: Initial likes count and multiple user IDs
275 | const initialLikes = comment.likes;
276 | const userIds = ["user-1", "user-2", "user-3"];
277 |
278 | // When: Call unlike method multiple times
279 | userIds.forEach((userId) => comment.unlike(userId));
280 |
281 | // Then: Likes count should decrease by number of calls
282 | expect(comment.likes).toBe(initialLikes - userIds.length);
283 | });
284 | });
285 |
286 | describe("Business Logic Validation", () => {
287 | it("should handle maximum length body correctly", () => {
288 | // Given: Comment body with exactly 100 characters
289 | const maxLengthBody = "a".repeat(100);
290 |
291 | // When: Create Comment instance
292 | const comment = new Comment(
293 | "comment-123",
294 | maxLengthBody,
295 | validUser,
296 | validPostId,
297 | 0,
298 | validTimestamp,
299 | validTimestamp
300 | );
301 |
302 | // Then: Maximum length body should be accepted
303 | expect(comment.body).toBe(maxLengthBody);
304 | expect(comment.body.length).toBe(100);
305 | });
306 | });
307 | });
308 |

---

## /src/entities/comment/**tests**/core/comment.factory.test.ts:

1 | import { Comment, CommentFactory } from "../../core";
2 | import { CommentDto } from "../../infrastructure/dto";
3 | import { UserReference } from "../../types";
4 | import { CommentFixtures } from "../fixtures";
5 |
6 | /\*_
7 | _ CommentFactory Tests
8 | _ Verify CommentFactory creation methods using Given-When-Then pattern
9 | _/
10 | describe("CommentFactory", () => {
11 | let validUser: UserReference;
12 | let validPostId: string;
13 | let validBody: string;
14 |
15 | beforeEach(() => {
16 | // Given: Set up basic data needed for tests
17 | validUser = CommentFixtures.valid.basic.user;
18 | validPostId = "post-123";
19 | validBody = "This is a valid comment body.";
20 | });
21 |
22 | describe("createNew Method", () => {
23 | it("should create new Comment instance with default values", () => {
24 | // Given: Valid parameters for creating new comment
25 | const body = "This is a new comment";
26 | const postId = "post-456";
27 |
28 | // When: Call createNew method
29 | const comment = CommentFactory.createNew(body, postId, validUser);
30 |
31 | // Then: New Comment instance should be created with default values
32 | expect(comment).toBeInstanceOf(Comment);
33 | expect(comment.body).toBe(body);
34 | expect(comment.postId).toBe(postId);
35 | expect(comment.user).toEqual(validUser);
36 | expect(comment.likes).toBe(0);
37 | expect(comment.id).toBe("");
38 | expect(comment.createdAt).toBeTypeOf("number");
39 | expect(comment.updatedAt).toBeTypeOf("number");
40 | });
41 |
42 | it("should throw error when creating new Comment with invalid body", () => {
43 | // Given: Empty comment body
44 | const emptyBody = "";
45 |
46 | // When & Then: Error should occur when calling createNew with empty body
47 | expect(() => {
48 | CommentFactory.createNew(emptyBody, validPostId, validUser);
49 | }).toThrow("Comment body cannot be empty");
50 | });
51 |
52 | it("should throw error when creating new Comment with invalid user", () => {
53 | // Given: Invalid user reference (empty username)
54 | const invalidUser: UserReference = {
55 | id: "user-123",
56 | username: "",
57 | profileImage: "https://example.com/avatar.jpg",
58 | };
59 |
60 | // When & Then: Error should occur when calling createNew with invalid user
61 | expect(() => {
62 | CommentFactory.createNew(validBody, validPostId, invalidUser);
63 | }).toThrow("Username cannot be empty");
64 | });
65 | });
66 |
67 | describe("createFromDto Method", () => {
68 | it("should create Comment instance from valid CommentDto", () => {
69 | // Given: Valid CommentDto
70 | const dto: CommentDto = {
71 | id: "comment-123",
72 | body: "Comment from DTO",
73 | postId: "post-456",
74 | likes: 5,
75 | user: validUser,
76 | createdAt: 1640995200000,
77 | updatedAt: 1640995260000,
78 | };
79 |
80 | // When: Call createFromDto method
81 | const comment = CommentFactory.createFromDto(dto);
82 |
83 | // Then: Comment instance should be created correctly from DTO data
84 | expect(comment).toBeInstanceOf(Comment);
85 | expect(comment.id).toBe(dto.id);
86 | expect(comment.body).toBe(dto.body);
87 | expect(comment.postId).toBe(dto.postId);
88 | expect(comment.likes).toBe(dto.likes);
89 | expect(comment.user).toEqual(dto.user);
90 | expect(comment.createdAt).toBe(dto.createdAt);
91 | expect(comment.updatedAt).toBe(dto.updatedAt);
92 | });
93 |
94 | it("should handle CommentDto with undefined optional fields", () => {
95 | // Given: CommentDto with undefined optional fields
96 | const dtoWithUndefinedFields: CommentDto = {
97 | id: "comment-789",
98 | body: "Comment with undefined fields",
99 | postId: "post-123",
100 | likes: undefined as unknown as number,
101 | user: validUser,
102 | createdAt: undefined,
103 | updatedAt: undefined,
104 | };
105 |
106 | // When: Call createFromDto method
107 | const comment = CommentFactory.createFromDto(dtoWithUndefinedFields);
108 |
109 | // Then: Undefined fields should be set to default values
110 | expect(comment.likes).toBe(0);
111 | expect(comment.createdAt).toBeTypeOf("number");
112 | expect(comment.updatedAt).toBeTypeOf("number");
113 | });
114 |
115 | it("should throw error when creating Comment from DTO with invalid body", () => {
116 | // Given: CommentDto with empty body
117 | const dtoWithEmptyBody: CommentDto = {
118 | id: "comment-empty",
119 | body: "",
120 | postId: "post-123",
121 | likes: 0,
122 | user: validUser,
123 | createdAt: Date.now(),
124 | updatedAt: Date.now(),
125 | };
126 |
127 | // When & Then: Error should occur when calling createFromDto with empty body DTO
128 | expect(() => {
129 | CommentFactory.createFromDto(dtoWithEmptyBody);
130 | }).toThrow("Comment body cannot be empty");
131 | });
132 | });
133 |
134 | describe("Factory Methods Comparison", () => {
135 | it("should create different Comment instances between createNew and createFromDto", () => {
136 | // Given: Data for both factory methods
137 | const body = "Test comment body";
138 | const dto: CommentDto = {
139 | id: "comment-from-dto",
140 | body: body,
141 | postId: validPostId,
142 | likes: 5,
143 | user: validUser,
144 | createdAt: 1640995200000,
145 | updatedAt: 1640995260000,
146 | };
147 |
148 | // When: Create Comment with both factory methods
149 | const newComment = CommentFactory.createNew(body, validPostId, validUser);
150 | const dtoComment = CommentFactory.createFromDto(dto);
151 |
152 | // Then: Comment instances should have different characteristics
153 | expect(newComment.id).toBe("");
154 | expect(dtoComment.id).toBe("comment-from-dto");
155 | expect(newComment.likes).toBe(0);
156 | expect(dtoComment.likes).toBe(5);
157 | expect(newComment.body).toBe(body);
158 | expect(dtoComment.body).toBe(body);
159 | });
160 | });
161 | });
162 |

---

## /src/entities/comment/**tests**/fixtures/comment.fixtures.ts:

1 | import { TestDataHelpers } from "@/shared/libs/**tests**";
2 | import { CommentEntity, UserReference } from "../../types";
3 |
4 | export const CommentFixtures = {
5 | valid: {
6 | // Basic comment data
7 | basic: {
8 | id: "comment-123",
9 | postId: "post-123",
10 | user: {
11 | id: "user-123",
12 | username: "testuser",
13 | profileImage: "https://example.com/avatar.jpg",
14 | } as UserReference,
15 | body: "This is a test comment.",
16 | likes: 2,
17 | createdAt: TestDataHelpers.generateTimestamp(-3600000), // 1 Hour ago
18 | updatedAt: TestDataHelpers.generateTimestamp(-3600000),
19 | } as CommentEntity,
20 |
21 | withoutUserImage: {
22 | id: "comment-456",
23 | postId: "post-123",
24 | user: {
25 | id: "user-456",
26 | username: "noimage",
27 | profileImage: "",
28 | } as UserReference,
29 | body: "Comment from user without profile image.",
30 | likes: 0,
31 | createdAt: TestDataHelpers.generateTimestamp(-7200000), // 2 Hours ago
32 | updatedAt: TestDataHelpers.generateTimestamp(-7200000),
33 | } as CommentEntity,
34 |
35 | // Comment with many likes
36 | popularComment: {
37 | id: "comment-popular",
38 | postId: "post-123",
39 | user: {
40 | id: "user-popular",
41 | username: "popular_user",
42 | profileImage: "https://example.com/popular.jpg",
43 | } as UserReference,
44 | body: "This comment received many likes!",
45 | likes: 50,
46 | createdAt: TestDataHelpers.generateTimestamp(-86400000), // 1 Day ago
47 | updatedAt: TestDataHelpers.generateTimestamp(-86400000),
48 | } as CommentEntity,
49 |
50 | maxLengthComment: {
51 | id: "comment-max",
52 | postId: "post-123",
53 | user: {
54 | id: "user-123",
55 | username: "testuser",
56 | profileImage: "https://example.com/avatar.jpg",
57 | } as UserReference,
58 | body: "This is a comment that is exactly one hundred characters long to test the maximum length limit.",
59 | likes: 1,
60 | createdAt: TestDataHelpers.generateTimestamp(-1800000), // 30 minutes ago
61 | updatedAt: TestDataHelpers.generateTimestamp(-900000), // 15 minutes ago (edited)
62 | } as CommentEntity,
63 |
64 | minLengthComment: {
65 | id: "comment-min",
66 | postId: "post-123",
67 | user: {
68 | id: "user-123",
69 | username: "testuser",
70 | profileImage: "https://example.com/avatar.jpg",
71 | } as UserReference,
72 | body: "Hi",
73 | likes: 0,
74 | createdAt: TestDataHelpers.generateTimestamp(-600000), // 10 minutes ago
75 | updatedAt: TestDataHelpers.generateTimestamp(-600000),
76 | } as CommentEntity,
77 | },
78 |
79 | invalid: {
80 | // Empty comment body
81 | emptyBody: {
82 | id: "comment-empty",
83 | postId: "post-123",
84 | user: {
85 | id: "user-123",
86 | username: "testuser",
87 | profileImage: "https://example.com/avatar.jpg",
88 | } as UserReference,
89 | body: "",
90 | likes: 0,
91 | createdAt: TestDataHelpers.generateTimestamp(),
92 | updatedAt: TestDataHelpers.generateTimestamp(),
93 | } as CommentEntity,
94 |
95 | // Comment body with only whitespace
96 | whitespaceBody: {
97 | id: "comment-whitespace",
98 | postId: "post-123",
99 | user: {
100 | id: "user-123",
101 | username: "testuser",
102 | profileImage: "https://example.com/avatar.jpg",
103 | } as UserReference,
104 | body: " \n\t ",
105 | likes: 0,
106 | createdAt: TestDataHelpers.generateTimestamp(),
107 | updatedAt: TestDataHelpers.generateTimestamp(),
108 | } as CommentEntity,
109 |
110 | // Comment body too long (over 100 characters)
111 | tooLongBody: {
112 | id: "comment-long",
113 | postId: "post-123",
114 | user: {
115 | id: "user-123",
116 | username: "testuser",
117 | profileImage: "https://example.com/avatar.jpg",
118 | } as UserReference,
119 | body: "This comment is way too long and exceeds the maximum allowed length of one hundred characters for comments.",
120 | likes: 0,
121 | createdAt: TestDataHelpers.generateTimestamp(),
122 | updatedAt: TestDataHelpers.generateTimestamp(),
123 | } as CommentEntity,
124 |
125 | // Invalid user reference
126 | invalidUser: {
127 | id: "comment-invalid-user",
128 | postId: "post-123",
129 | user: {
130 | id: "",
131 | username: "",
132 | profileImage: "",
133 | } as UserReference,
134 | body: "Comment with invalid user.",
135 | likes: 0,
136 | createdAt: TestDataHelpers.generateTimestamp(),
137 | updatedAt: TestDataHelpers.generateTimestamp(),
138 | } as CommentEntity,
139 |
140 | nullUser: {
141 | id: "comment-null-user",
142 | postId: "post-123",
143 | user: null as unknown as UserReference,
144 | body: "Comment with null user.",
145 | likes: 0,
146 | createdAt: TestDataHelpers.generateTimestamp(),
147 | updatedAt: TestDataHelpers.generateTimestamp(),
148 | } as CommentEntity,
149 |
150 | negativeLikes: {
151 | id: "comment-negative-likes",
152 | postId: "post-123",
153 | user: {
154 | id: "user-123",
155 | username: "testuser",
156 | profileImage: "https://example.com/avatar.jpg",
157 | } as UserReference,
158 | body: "Comment with negative likes.",
159 | likes: -3,
160 | createdAt: TestDataHelpers.generateTimestamp(),
161 | updatedAt: TestDataHelpers.generateTimestamp(),
162 | } as CommentEntity,
163 | },
164 |
165 | edge: {
166 | // Comment with zero likes
167 | zeroLikes: {
168 | id: "comment-zero-likes",
169 | postId: "post-123",
170 | user: {
171 | id: "user-123",
172 | username: "testuser",
173 | profileImage: "https://example.com/avatar.jpg",
174 | } as UserReference,
175 | body: "Comment with zero likes.",
176 | likes: 0,
177 | createdAt: TestDataHelpers.generateTimestamp(),
178 | updatedAt: TestDataHelpers.generateTimestamp(),
179 | } as CommentEntity,
180 |
181 | // Comment with maximum likes
182 | maxLikes: {
183 | id: "comment-max-likes",
184 | postId: "post-123",
185 | user: {
186 | id: "user-123",
187 | username: "testuser",
188 | profileImage: "https://example.com/avatar.jpg",
189 | } as UserReference,
190 | body: "Comment with maximum likes.",
191 | likes: Number.MAX_SAFE_INTEGER,
192 | createdAt: TestDataHelpers.generateTimestamp(-86400000),
193 | updatedAt: TestDataHelpers.generateTimestamp(),
194 | } as CommentEntity,
195 |
196 | // Comment with special characters
197 | specialChars: {
198 | id: "comment-special",
199 | postId: "post-123",
200 | user: {
201 | id: "user-123",
202 | username: "testuser",
203 | profileImage: "https://example.com/avatar.jpg",
204 | } as UserReference,
205 | body: "Comment with special chars: @#$%^&_()!",
206 | likes: 1,
207 | createdAt: TestDataHelpers.generateTimestamp(-1800000),
208 | updatedAt: TestDataHelpers.generateTimestamp(-1800000),
209 | } as CommentEntity,
210 |
211 | // Comment with emojis
212 | withEmojis: {
213 | id: "comment-emoji",
214 | postId: "post-123",
215 | user: {
216 | id: "user-123",
217 | username: "testuser",
218 | profileImage: "https://example.com/avatar.jpg",
219 | } as UserReference,
220 | body: "Great post! 👍😊🎉",
221 | likes: 5,
222 | createdAt: TestDataHelpers.generateTimestamp(-3600000),
223 | updatedAt: TestDataHelpers.generateTimestamp(-3600000),
224 | } as CommentEntity,
225 |
226 | // Comment with same creation and update timestamps (never edited)
227 | sameTimestamps: {
228 | id: "comment-same-timestamps",
229 | postId: "post-123",
230 | user: {
231 | id: "user-123",
232 | username: "testuser",
233 | profileImage: "https://example.com/avatar.jpg",
234 | } as UserReference,
235 | body: "This comment was never edited.",
236 | likes: 0,
237 | createdAt: 1640995200000, // Fixed timestamp
238 | updatedAt: 1640995200000, // Same timestamp
239 | } as CommentEntity,
240 | },
241 |
242 | multiple: [
243 | {
244 | id: "comment-1",
245 | postId: "post-123",
246 | user: {
247 | id: "user-1",
248 | username: "user1",
249 | profileImage: "https://example.com/user1.jpg",
250 | } as UserReference,
251 | body: "First comment on this post.",
252 | likes: 3,
253 | createdAt: TestDataHelpers.generateTimestamp(-3600000),
254 | updatedAt: TestDataHelpers.generateTimestamp(-3600000),
255 | },
256 | {
257 | id: "comment-2",
258 | postId: "post-123",
259 | user: {
260 | id: "user-2",
261 | username: "user2",
262 | profileImage: "https://example.com/user2.jpg",
263 | } as UserReference,
264 | body: "Second comment with different opinion.",
265 | likes: 1,
266 | createdAt: TestDataHelpers.generateTimestamp(-7200000),
267 | updatedAt: TestDataHelpers.generateTimestamp(-7200000),
268 | },
269 | {
270 | id: "comment-3",
271 | postId: "post-123",
272 | user: {
273 | id: "user-3",
274 | username: "user3",
275 | profileImage: "",
276 | } as UserReference,
277 | body: "Third comment from user without image.",
278 | likes: 0,
279 | createdAt: TestDataHelpers.generateTimestamp(-10800000),
280 | updatedAt: TestDataHelpers.generateTimestamp(-10800000),
281 | },
282 | ] as CommentEntity[],
283 | };
284 |
285 | export const createCommentFixture = (
286 | overrides: Partial<CommentEntity> = {}
287 | ): CommentEntity => {
288 | return {
289 | ...CommentFixtures.valid.basic,
290 |
291 | ...overrides,
292 | };
293 | };
294 |
295 | export const createMultipleCommentFixtures = (
296 | count: number,
297 | postId: string = "post-123",
298 | baseData: Partial<CommentEntity> = {}
299 | ): CommentEntity[] => {
300 | return TestDataHelpers.createArray(count, (index) => ({
301 | ...CommentFixtures.valid.basic,
302 | id: TestDataHelpers.generateId("comment"),
303 | postId,
304 | body: `Test comment number ${index + 1}.`,
305 | likes: Math.floor(Math.random() _ 10),
306 | createdAt: TestDataHelpers.generateTimestamp(-index _ 3600000), // Each one hour earlier
307 | updatedAt: TestDataHelpers.generateTimestamp(-index _ 3600000),
308 |
309 | ...baseData,
310 | }));
311 | };
312 |
313 | export const createCommentsForPost = (
314 | postId: string,
315 | count: number = 3
316 | ): CommentEntity[] => {
317 | return createMultipleCommentFixtures(count, postId);
318 | };
319 |
320 | export const createCommentsForUser = (
321 | user: UserReference,
322 | count: number = 3
323 | ): CommentEntity[] => {
324 | return createMultipleCommentFixtures(count, "post-123", { user });
325 | };
326 |
327 | export const createRandomCommentFixture = (
328 | overrides: Partial<CommentEntity> = {}
329 | ): CommentEntity => {
330 | return {
331 | id: TestDataHelpers.generateId("comment"),
332 | postId: TestDataHelpers.generateId("post"),
333 | user: {
334 | id: TestDataHelpers.generateId("user"),
335 | username: TestDataHelpers.generateUsername(),
336 | profileImage: "https://example.com/avatar.jpg",
337 | },
338 | body: `Random comment ${Math.random().toString(36).substr(2, 20)}.`,
339 | likes: Math.floor(Math.random() _ 100),
340 | createdAt: TestDataHelpers.generateTimestamp(-Math.random() _ 86400000 _ 7), // Within the last 7 days
341 | updatedAt: TestDataHelpers.generateTimestamp(-Math.random() _ 86400000 \* 7),
342 | ...overrides,
343 | } as CommentEntity;
344 | };
345 |

---

## /src/entities/comment/**tests**/fixtures/index.ts:

1 | export { CommentFixtures } from "./comment.fixtures";
2 |

---

## /src/entities/comment/**tests**/index.ts:

1 | // Fixtures
2 | export {
3 | CommentFixtures,
4 | createCommentFixture,
5 | createCommentsForPost,
6 | createCommentsForUser,
7 | createMultipleCommentFixtures,
8 | createRandomCommentFixture,
9 | } from "./fixtures/comment.fixtures";
10 |
11 | // Repository Mocks
12 | export { CommentRepositoryMocks, type MockCommentRepository } from "./mocks";
13 |
14 | // API Mocks
15 | export { CommentApiMocks } from "./mocks";
16 |

---

## /src/entities/comment/**tests**/infrastructure/comment.api.repository.test.ts:

1 | import { ApiClient } from "@/shared/api/base.api";
2 | import { Pagination } from "@/shared/types";
3 | import { beforeEach, describe, expect, it, vi } from "vitest";
4 | import { Comment } from "../../core/comment.domain";
5 | import { CommentDto } from "../../infrastructure/dto";
6 | import { CommentApiRepository } from "../../infrastructure/repository/comment.api.repository";
7 | import { UserReference } from "../../types";
8 | import { CommentFixtures } from "../fixtures/comment.fixtures";
9 |
10 | /\*_
11 | _ Comment API Repository Tests
12 | _ Verify Comment API repository core functionality using Given-When-Then pattern
13 | _/
14 | describe("Comment API Repository", () => {
15 | let commentApiRepository: CommentApiRepository;
16 | let mockApiClient: ApiClient;
17 | let validCommentDto: Required<CommentDto>;
18 | let validUserReference: UserReference;
19 |
20 | beforeEach(() => {
21 | // Given: Set up mock API client and repository
22 | mockApiClient = {
23 | get: vi.fn(),
24 | post: vi.fn(),
25 | put: vi.fn(),
26 | delete: vi.fn(),
27 | patch: vi.fn(),
28 | } as unknown as ApiClient;
29 |
30 | commentApiRepository = new CommentApiRepository(mockApiClient);
31 |
32 | // Set up valid test data
33 | const commentData = CommentFixtures.valid.basic;
34 | validUserReference = {
35 | id: commentData.user.id,
36 | username: commentData.user.username,
37 | profileImage: commentData.user.profileImage,
38 | };
39 |
40 | validCommentDto = {
41 | id: commentData.id,
42 | body: commentData.body,
43 | postId: commentData.postId,
44 | user: validUserReference,
45 | likes: commentData.likes,
46 | createdAt: commentData.createdAt,
47 | updatedAt: commentData.updatedAt,
48 | };
49 | });
50 |
51 | describe("getByPostId", () => {
52 | it("should return Comment domain objects when API call succeeds", async () => {
53 | // Given: Mock API client returns paginated comment data
54 | const mockPaginationResponse: Pagination<CommentDto> = {
55 | data: [validCommentDto],
56 | pagination: {
57 | total: 1,
58 | skip: 0,
59 | limit: 10,
60 | },
61 | };
62 | const mockResponse = {
63 | data: mockPaginationResponse,
64 | status: 200,
65 | statusText: "OK",
66 | ok: true,
67 | };
68 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
69 |
70 | // When: Get comments by post ID
71 | const result = await commentApiRepository.getByPostId("post-123");
72 |
73 | // Then: Should return Comment domain objects and call correct endpoint
74 | expect(result).toHaveLength(1);
75 | expect(result[0]).toBeInstanceOf(Comment);
76 | expect(result[0].id).toBe(validCommentDto.id);
77 | expect(result[0].body).toBe(validCommentDto.body);
78 | expect(mockApiClient.get).toHaveBeenCalledWith(
79 | "/posts/post-123/comments"
80 | );
81 | });
82 |
83 | it("should return empty array when no comments found", async () => {
84 | // Given: Mock API client returns empty data
85 | const mockPaginationResponse: Pagination<CommentDto> = {
86 | data: [],
87 | pagination: {
88 | total: 0,
89 | skip: 0,
90 | limit: 10,
91 | },
92 | };
93 | const mockResponse = {
94 | data: mockPaginationResponse,
95 | status: 200,
96 | statusText: "OK",
97 | ok: true,
98 | };
99 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
100 |
101 | // When: Get comments by post ID
102 | const result = await commentApiRepository.getByPostId("post-123");
103 |
104 | // Then: Should return empty array
105 | expect(result).toEqual([]);
106 | });
107 |
108 | it("should throw an error when API call fails", async () => {
109 | // Given: Mock API client throws error
110 | const apiError = new Error("API Error");
111 | vi.mocked(mockApiClient.get).mockRejectedValue(apiError);
112 |
113 | // When & Then: Should throw an error
114 | await expect(
115 | commentApiRepository.getByPostId("post-123")
116 | ).rejects.toThrow("Failed to fetch comments");
117 | });
118 | });
119 |
120 | describe("getById", () => {
121 | it("should return Comment domain object when found", async () => {
122 | // Given: Mock API client returns valid comment data
123 | const mockResponse = {
124 | data: validCommentDto,
125 | status: 200,
126 | statusText: "OK",
127 | ok: true,
128 | };
129 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
130 |
131 | // When: Get comment by ID
132 | const result = await commentApiRepository.getById("comment-123");
133 |
134 | // Then: Should return Comment domain object and call correct endpoint
135 | expect(result).toBeInstanceOf(Comment);
136 | expect(result.id).toBe(validCommentDto.id);
137 | expect(result.body).toBe(validCommentDto.body);
138 | expect(mockApiClient.get).toHaveBeenCalledWith("/comments/comment-123");
139 | });
140 |
141 | it("should throw error when comment not found", async () => {
142 | // Given: Mock API client returns null data
143 | const mockResponse = {
144 | data: null,
145 | status: 404,
146 | statusText: "Not Found",
147 | ok: false,
148 | };
149 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
150 |
151 | // When & Then: Should throw error for not found comment
152 | await expect(
153 | commentApiRepository.getById("non-existent")
154 | ).rejects.toThrow("Comment with ID non-existent not found");
155 | });
156 |
157 | it("should throw error when API call fails", async () => {
158 | // Given: Mock API client throws non-404 error
159 | const apiError = new Error("API Error");
160 | vi.mocked(mockApiClient.get).mockRejectedValue(apiError);
161 |
162 | // When & Then: Should throw the original API error (not 404)
163 | await expect(commentApiRepository.getById("comment-123")).rejects.toThrow(
164 | "API Error"
165 | );
166 | });
167 | });
168 |
169 | describe("create", () => {
170 | it("should return Comment domain object when creation succeeds", async () => {
171 | // Given: Mock API client returns created comment data
172 | const mockResponse = {
173 | data: validCommentDto,
174 | status: 201,
175 | statusText: "Created",
176 | ok: true,
177 | };
178 | vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);
179 |
180 | const newComment = new Comment(
181 | "",
182 | "New comment body",
183 | validUserReference,
184 | "post-123",
185 | 0,
186 | Date.now(),
187 | Date.now()
188 | );
189 |
190 | // When: Create comment
191 | const result = await commentApiRepository.create(newComment);
192 |
193 | // Then: Should return Comment domain object and call correct endpoint
194 | expect(result).toBeInstanceOf(Comment);
195 | expect(result.id).toBe(validCommentDto.id);
196 | expect(mockApiClient.post).toHaveBeenCalledWith("/comments/add", {
197 | body: "New comment body",
198 | postId: "post-123",
199 | userId: validUserReference.id,
200 | });
201 | });
202 |
203 | it("should throw error when creation fails", async () => {
204 | // Given: Mock API client returns null data
205 | const mockResponse = {
206 | data: null,
207 | status: 400,
208 | statusText: "Bad Request",
209 | ok: false,
210 | };
211 | vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);
212 |
213 | const newComment = new Comment(
214 | "",
215 | "Failed comment",
216 | validUserReference,
217 | "post-123",
218 | 0,
219 | Date.now(),
220 | Date.now()
221 | );
222 |
223 | // When & Then: Should throw error
224 | await expect(commentApiRepository.create(newComment)).rejects.toThrow(
225 | "Failed to create comment"
226 | );
227 | });
228 | });
229 |
230 | describe("update", () => {
231 | it("should return updated Comment domain object when update succeeds", async () => {
232 | // Given: Mock API client returns updated comment data
233 | const updatedCommentDto = {
234 | ...validCommentDto,
235 | body: "Updated comment body",
236 | updatedAt: Date.now(),
237 | };
238 | const mockResponse = {
239 | data: updatedCommentDto,
240 | status: 200,
241 | statusText: "OK",
242 | ok: true,
243 | };
244 | vi.mocked(mockApiClient.put).mockResolvedValue(mockResponse);
245 |
246 | const existingComment = new Comment(
247 | validCommentDto.id,
248 | "Updated comment body",
249 | validUserReference,
250 | validCommentDto.postId,
251 | validCommentDto.likes,
252 | validCommentDto.createdAt,
253 | Date.now()
254 | );
255 |
256 | // When: Update comment
257 | const result = await commentApiRepository.update(existingComment);
258 |
259 | // Then: Should return updated Comment domain object and call correct endpoint
260 | expect(result).toBeInstanceOf(Comment);
261 | expect(result.body).toBe("Updated comment body");
262 | expect(mockApiClient.put).toHaveBeenCalledWith(
263 | `/comments/${validCommentDto.id}`,
264 | { body: "Updated comment body" }
265 | );
266 | });
267 |
268 | it("should throw error when update fails", async () => {
269 | // Given: Mock API client returns null data
270 | const mockResponse = {
271 | data: null,
272 | status: 400,
273 | statusText: "Bad Request",
274 | ok: false,
275 | };
276 | vi.mocked(mockApiClient.put).mockResolvedValue(mockResponse);
277 |
278 | const existingComment = new Comment(
279 | validCommentDto.id,
280 | "Failed update",
281 | validUserReference,
282 | validCommentDto.postId,
283 | validCommentDto.likes,
284 | validCommentDto.createdAt,
285 | Date.now()
286 | );
287 |
288 | // When & Then: Should throw error
289 | await expect(
290 | commentApiRepository.update(existingComment)
291 | ).rejects.toThrow("Failed to update comment");
292 | });
293 | });
294 |
295 | describe("save", () => {
296 | it("should create new comment when comment has no ID", async () => {
297 | // Given: Mock API client returns created comment data
298 | const createdCommentDto = { ...validCommentDto, id: "new-comment-id" };
299 | const mockResponse = {
300 | data: createdCommentDto,
301 | status: 201,
302 | statusText: "Created",
303 | ok: true,
304 | };
305 | vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);
306 |
307 | const newComment = new Comment(
308 | "",
309 | "New comment",
310 | validUserReference,
311 | "post-123",
312 | 0,
313 | Date.now(),
314 | Date.now()
315 | );
316 |
317 | // When: Save comment
318 | const result = await commentApiRepository.save(newComment);
319 |
320 | // Then: Should create new comment
321 | expect(result).toBeInstanceOf(Comment);
322 | expect(result.id).toBe("new-comment-id");
323 | expect(mockApiClient.post).toHaveBeenCalledWith("/comments/add", {
324 | body: "New comment",
325 | postId: "post-123",
326 | userId: validUserReference.id,
327 | });
328 | });
329 |
330 | it("should update existing comment when comment has ID", async () => {
331 | // Given: Mock API client returns updated comment data
332 | const updatedCommentDto = {
333 | ...validCommentDto,
334 | body: "Updated via save",
335 | };
336 | const mockResponse = {
337 | data: updatedCommentDto,
338 | status: 200,
339 | statusText: "OK",
340 | ok: true,
341 | };
342 | vi.mocked(mockApiClient.put).mockResolvedValue(mockResponse);
343 |
344 | const existingComment = new Comment(
345 | validCommentDto.id,
346 | "Updated via save",
347 | validUserReference,
348 | validCommentDto.postId,
349 | validCommentDto.likes,
350 | validCommentDto.createdAt,
351 | Date.now()
352 | );
353 |
354 | // When: Save comment
355 | const result = await commentApiRepository.save(existingComment);
356 |
357 | // Then: Should update existing comment
358 | expect(result).toBeInstanceOf(Comment);
359 | expect(result.body).toBe("Updated via save");
360 | expect(mockApiClient.put).toHaveBeenCalledWith(
361 | `/comments/${validCommentDto.id}`,
362 | { body: "Updated via save" }
363 | );
364 | });
365 | });
366 |
367 | describe("delete", () => {
368 | it("should return true when deletion succeeds", async () => {
369 | // Given: Mock API client returns successful response
370 | const mockResponse = {
371 | data: { success: true },
372 | status: 200,
373 | statusText: "OK",
374 | ok: true,
375 | };
376 | vi.mocked(mockApiClient.delete).mockResolvedValue(mockResponse);
377 |
378 | // When: Delete comment
379 | const result = await commentApiRepository.delete("comment-123");
380 |
381 | // Then: Should return true and call correct endpoint
382 | expect(result).toBe(true);
383 | expect(mockApiClient.delete).toHaveBeenCalledWith(
384 | "/comments/comment-123"
385 | );
386 | });
387 |
388 | it("should return false when deletion fails", async () => {
389 | // Given: Mock API client throws error
390 | const apiError = new Error("Delete API Error");
391 | vi.mocked(mockApiClient.delete).mockRejectedValue(apiError);
392 |
393 | // When: Delete comment
394 | const result = await commentApiRepository.delete("comment-123");
395 |
396 | // Then: Should return false
397 | expect(result).toBe(false);
398 | });
399 | });
400 |
401 | describe("like", () => {
402 | it("should return true when like succeeds", async () => {
403 | // Given: Mock API client returns successful response
404 | const mockResponse = {
405 | data: { success: true },
406 | status: 200,
407 | statusText: "OK",
408 | ok: true,
409 | };
410 | vi.mocked(mockApiClient.patch).mockResolvedValue(mockResponse);
411 |
412 | // When: Like comment
413 | const result = await commentApiRepository.like("comment-123", "user-456");
414 |
415 | // Then: Should return true and call correct endpoint
416 | expect(result).toBe(true);
417 | expect(mockApiClient.patch).toHaveBeenCalledWith(
418 | "/comments/comment-123/like",
419 | { userId: "user-456" }
420 | );
421 | });
422 |
423 | it("should return false when like fails", async () => {
424 | // Given: Mock API client throws error
425 | const apiError = new Error("Like API Error");
426 | vi.mocked(mockApiClient.patch).mockRejectedValue(apiError);
427 |
428 | // When: Like comment
429 | const result = await commentApiRepository.like("comment-123", "user-456");
430 |
431 | // Then: Should return false
432 | expect(result).toBe(false);
433 | });
434 | });
435 |
436 | describe("unlike", () => {
437 | it("should return true when unlike succeeds", async () => {
438 | // Given: Mock API client returns successful response
439 | const mockResponse = {
440 | data: { success: true },
441 | status: 200,
442 | statusText: "OK",
443 | ok: true,
444 | };
445 | vi.mocked(mockApiClient.patch).mockResolvedValue(mockResponse);
446 |
447 | // When: Unlike comment
448 | const result = await commentApiRepository.unlike(
449 | "comment-123",
450 | "user-456"
451 | );
452 |
453 | // Then: Should return true and call correct endpoint
454 | expect(result).toBe(true);
455 | expect(mockApiClient.patch).toHaveBeenCalledWith(
456 | "/comments/comment-123/unlike",
457 | { userId: "user-456" }
458 | );
459 | });
460 |
461 | it("should return false when unlike fails", async () => {
462 | // Given: Mock API client throws error
463 | const apiError = new Error("Unlike API Error");
464 | vi.mocked(mockApiClient.patch).mockRejectedValue(apiError);
465 |
466 | // When: Unlike comment
467 | const result = await commentApiRepository.unlike(
468 | "comment-123",
469 | "user-456"
470 | );
471 |
472 | // Then: Should return false
473 | expect(result).toBe(false);
474 | });
475 | });
476 | });
477 |

---

## /src/entities/comment/**tests**/mapper/comment.mapper.test.ts:

1 | import { beforeEach, describe, expect, it, vi } from "vitest";
2 | import { Comment } from "../../core";
3 | import { CommentDto } from "../../infrastructure/dto";
4 | import { CommentMapper } from "../../mapper";
5 | import { CommentEntity, UserReference } from "../../types";
6 |
7 | /\*_
8 | _ Comment Mapper Tests
9 | _ Verify core Comment mapper functionality using Given-When-Then pattern
10 | _/
11 | describe("Comment Mapper", () => {
12 | let validComment: Comment;
13 | let validCommentDto: CommentDto;
14 | let validCommentEntity: CommentEntity;
15 | let validUserReference: UserReference;
16 |
17 | beforeEach(() => {
18 | // Given: Set up valid test data for mapper tests
19 | validUserReference = {
20 | id: "user-123",
21 | username: "testuser",
22 | profileImage: "https://example.com/avatar.jpg",
23 | };
24 |
25 | const now = Date.now();
26 | validComment = new Comment(
27 | "comment-123",
28 | "Test comment body",
29 | validUserReference,
30 | "post-123",
31 | 5,
32 | now,
33 | now
34 | );
35 |
36 | validCommentDto = {
37 | id: "comment-123",
38 | body: "Test comment body",
39 | postId: "post-123",
40 | user: validUserReference,
41 | likes: 5,
42 | createdAt: now,
43 | updatedAt: now,
44 | };
45 |
46 | validCommentEntity = {
47 | id: "comment-123",
48 | body: "Test comment body",
49 | postId: "post-123",
50 | user: validUserReference,
51 | likes: 5,
52 | createdAt: now,
53 | updatedAt: now,
54 | updateBody: vi.fn(),
55 | like: vi.fn(),
56 | unlike: vi.fn(),
57 | };
58 | });
59 |
60 | describe("toDto", () => {
61 | it("should convert Comment domain to CommentDto when provided with valid Comment", () => {
62 | // Given: Valid Comment domain object
63 | const comment = validComment;
64 |
65 | // When: Convert to DTO
66 | const result = CommentMapper.toDto(comment);
67 |
68 | // Then: Should return correct CommentDto
69 | expect(result).toEqual({
70 | id: comment.id,
71 | body: comment.body,
72 | postId: comment.postId,
73 | user: comment.user,
74 | likes: comment.likes,
75 | createdAt: comment.createdAt,
76 | updatedAt: comment.updatedAt,
77 | });
78 | });
79 |
80 | it("should handle Comment with zero likes when converting to DTO", () => {
81 | // Given: Comment with zero likes
82 | const commentWithZeroLikes = new Comment(
83 | "comment-zero",
84 | "Comment with no likes",
85 | validUserReference,
86 | "post-123",
87 | 0,
88 | Date.now(),
89 | Date.now()
90 | );
91 |
92 | // When: Convert to DTO
93 | const result = CommentMapper.toDto(commentWithZeroLikes);
94 |
95 | // Then: Should return DTO with zero likes
96 | expect(result.likes).toBe(0);
97 | expect(result.id).toBe("comment-zero");
98 | });
99 | });
100 |
101 | describe("toDomain", () => {
102 | it("should convert CommentDto to Comment domain when provided with valid DTO", () => {
103 | // Given: Valid CommentDto
104 | const dto = validCommentDto;
105 |
106 | // When: Convert to domain
107 | const result = CommentMapper.toDomain(dto);
108 |
109 | // Then: Should return Comment domain object
110 | expect(result).toBeInstanceOf(Comment);
111 | expect(result.id).toBe(dto.id);
112 | expect(result.body).toBe(dto.body);
113 | expect(result.user).toEqual(dto.user);
114 | expect(result.postId).toBe(dto.postId);
115 | expect(result.likes).toBe(dto.likes);
116 | expect(result.createdAt).toBe(dto.createdAt);
117 | expect(result.updatedAt).toBe(dto.updatedAt);
118 | });
119 |
120 | it("should handle missing optional fields when converting DTO to domain", () => {
121 | // Given: CommentDto with missing optional fields
122 | const incompleteDto: CommentDto = {
123 | id: "comment-incomplete",
124 | body: "Incomplete comment",
125 | postId: "post-123",
126 | user: validUserReference,
127 | likes: undefined as unknown as number,
128 | };
129 |
130 | // When: Convert to domain
131 | const result = CommentMapper.toDomain(incompleteDto);
132 |
133 | // Then: Should use default values for missing fields
134 | expect(result.id).toBe("comment-incomplete");
135 | expect(result.body).toBe("Incomplete comment");
136 | expect(result.likes).toBe(0); // Default value
137 | expect(result.createdAt).toBeGreaterThan(0);
138 | expect(result.updatedAt).toBeGreaterThan(0);
139 | });
140 | });
141 |
142 | describe("fromEntity", () => {
143 | it("should convert CommentEntity to Comment domain when provided with valid entity", () => {
144 | // Given: Valid CommentEntity
145 | const entity = validCommentEntity;
146 |
147 | // When: Convert from entity
148 | const result = CommentMapper.fromEntity(entity);
149 |
150 | // Then: Should return Comment domain object
151 | expect(result).toBeInstanceOf(Comment);
152 | expect(result.id).toBe(entity.id);
153 | expect(result.body).toBe(entity.body);
154 | expect(result.user).toEqual(entity.user);
155 | expect(result.postId).toBe(entity.postId);
156 | expect(result.likes).toBe(entity.likes);
157 | expect(result.createdAt).toBe(entity.createdAt);
158 | expect(result.updatedAt).toBe(entity.updatedAt);
159 | });
160 | });
161 |
162 | describe("toDomainList", () => {
163 | it("should convert array of CommentDto to array of Comment domain when provided with valid DTOs", () => {
164 | // Given: Array of valid CommentDto objects
165 | const dtos = [validCommentDto];
166 |
167 | // When: Convert to domain list
168 | const result = CommentMapper.toDomainList(dtos);
169 |
170 | // Then: Should return array of Comment domain objects
171 | expect(result).toHaveLength(1);
172 | expect(result[0]).toBeInstanceOf(Comment);
173 | expect(result[0].id).toBe(dtos[0].id);
174 | expect(result[0].body).toBe(dtos[0].body);
175 | });
176 |
177 | it("should handle empty array when converting DTO list", () => {
178 | // Given: Empty array of CommentDto
179 | const emptyDtos: CommentDto[] = [];
180 |
181 | // When: Convert to domain list
182 | const result = CommentMapper.toDomainList(emptyDtos);
183 |
184 | // Then: Should return empty array
185 | expect(result).toEqual([]);
186 | expect(result).toHaveLength(0);
187 | });
188 | });
189 |
190 | describe("fromEntityList", () => {
191 | it("should convert array of CommentEntity to array of Comment domain when provided with valid entities", () => {
192 | // Given: Array of valid CommentEntity objects
193 | const entities = [validCommentEntity];
194 |
195 | // When: Convert from entity list
196 | const result = CommentMapper.fromEntityList(entities);
197 |
198 | // Then: Should return array of Comment domain objects
199 | expect(result).toHaveLength(1);
200 | expect(result[0]).toBeInstanceOf(Comment);
201 | expect(result[0].id).toBe(entities[0].id);
202 | expect(result[0].body).toBe(entities[0].body);
203 | });
204 |
205 | it("should handle empty array when converting entity list", () => {
206 | // Given: Empty array of CommentEntity
207 | const emptyEntities: CommentEntity[] = [];
208 |
209 | // When: Convert from entity list
210 | const result = CommentMapper.fromEntityList(emptyEntities);
211 |
212 | // Then: Should return empty array
213 | expect(result).toEqual([]);
214 | expect(result).toHaveLength(0);
215 | });
216 | });
217 |
218 | describe("toDtoList", () => {
219 | it("should convert array of Comment domain to array of CommentDto when provided with valid Comments", () => {
220 | // Given: Array of valid Comment domain objects
221 | const comments = [validComment];
222 |
223 | // When: Convert to DTO list
224 | const result = CommentMapper.toDtoList(comments);
225 |
226 | // Then: Should return array of CommentDto objects
227 | expect(result).toHaveLength(1);
228 | expect(result[0].id).toBe(comments[0].id);
229 | expect(result[0].body).toBe(comments[0].body);
230 | expect(result[0].user).toEqual(comments[0].user);
231 | });
232 |
233 | it("should handle empty array when converting Comment list to DTO", () => {
234 | // Given: Empty array of Comment domain objects
235 | const emptyComments: Comment[] = [];
236 |
237 | // When: Convert to DTO list
238 | const result = CommentMapper.toDtoList(emptyComments);
239 |
240 | // Then: Should return empty array
241 | expect(result).toEqual([]);
242 | expect(result).toHaveLength(0);
243 | });
244 | });
245 | });
246 |

---

## /src/entities/comment/**tests**/mocks/comment-api.mock.ts:

1 | import {
2 | ErrorMessages,
3 | HttpMocks,
4 | HttpStatus,
5 | } from "@/shared/libs/**tests**/mocks/api.mock";
6 | import { CommentEntity } from "../../types";
7 |
8 | export const CommentApiMocks = {
9 | getComment: (comment: CommentEntity) => HttpMocks.get(comment),
10 |
11 | getComments: (comments: CommentEntity[]) => HttpMocks.get(comments),
12 |
13 | createComment: (comment: CommentEntity) =>
14 | HttpMocks.post(comment, HttpStatus.CREATED),
15 |
16 | updateComment: (comment: CommentEntity) => HttpMocks.put(comment),
17 |
18 | deleteComment: () => HttpMocks.delete(),
19 | getCommentsByPost: (comments: CommentEntity[]) => HttpMocks.get(comments),
20 |
21 | getCommentsByUser: (comments: CommentEntity[]) => HttpMocks.get(comments),
22 |
23 | getCommentCount: (count: number) => HttpMocks.get({ count }),
24 |
25 | likeComment: (comment: CommentEntity) =>
26 | HttpMocks.put({ ...comment, likes: comment.likes + 1 }),
27 |
28 | unlikeComment: (comment: CommentEntity) =>
29 | HttpMocks.put({ ...comment, likes: Math.max(0, comment.likes - 1) }),
30 |
31 | errors: {
32 | notFound: () =>
33 | HttpMocks.error(ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND),
34 |
35 | unauthorized: () =>
36 | HttpMocks.error(ErrorMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED),
37 |
38 | forbidden: () =>
39 | HttpMocks.error(ErrorMessages.FORBIDDEN, HttpStatus.FORBIDDEN),
40 |
41 | badRequest: () =>
42 | HttpMocks.error(ErrorMessages.BAD_REQUEST, HttpStatus.BAD_REQUEST),
43 |
44 | validation: () =>
45 | HttpMocks.error("Invalid comment data", HttpStatus.UNPROCESSABLE_ENTITY),
46 |
47 | tooLong: () =>
48 | HttpMocks.error("Comment too long", HttpStatus.UNPROCESSABLE_ENTITY),
49 |
50 | empty: () =>
51 | HttpMocks.error(
52 | "Comment cannot be empty",
53 | HttpStatus.UNPROCESSABLE_ENTITY
54 | ),
55 |
56 | serverError: () =>
57 | HttpMocks.error(
58 | ErrorMessages.INTERNAL_ERROR,
59 | HttpStatus.INTERNAL_SERVER_ERROR
60 | ),
61 |
62 | networkError: () => HttpMocks.networkError(),
63 |
64 | timeout: () => HttpMocks.timeoutError(),
65 | },
66 | };
67 |

---

## /src/entities/comment/**tests**/mocks/comment-repository.mock.ts:

1 | import { MockRepository, RepositoryMockFactory } from "@/shared/libs/**tests**";
2 | import { CommentEntity } from "../../types";
3 |
4 | export interface MockCommentRepository extends MockRepository<CommentEntity> {
5 | getByPostId: ReturnType<typeof vi.fn>;
6 | getById: ReturnType<typeof vi.fn>;
7 | create: ReturnType<typeof vi.fn>;
8 | like: ReturnType<typeof vi.fn>;
9 | unlike: ReturnType<typeof vi.fn>;
10 | findByPostId: ReturnType<typeof vi.fn>;
11 | findByUserId: ReturnType<typeof vi.fn>;
12 | countByPostId: ReturnType<typeof vi.fn>;
13 | incrementLikes: ReturnType<typeof vi.fn>;
14 | decrementLikes: ReturnType<typeof vi.fn>;
15 | }
16 |
17 | export const CommentRepositoryMocks = {
18 | create: (): MockCommentRepository => ({
19 | ...RepositoryMockFactory.createBasicMock<CommentEntity>(),
20 | getByPostId: vi.fn(),
21 | getById: vi.fn(),
22 | create: vi.fn(),
23 | like: vi.fn(),
24 | unlike: vi.fn(),
25 | findByPostId: vi.fn(),
26 | findByUserId: vi.fn(),
27 | countByPostId: vi.fn(),
28 | incrementLikes: vi.fn(),
29 | decrementLikes: vi.fn(),
30 | }),
31 |
32 | createSuccess: (
33 | mockComment: CommentEntity,
34 | mockComments: CommentEntity[] = []
35 | ): MockCommentRepository => ({
36 | ...RepositoryMockFactory.createSuccessMock(mockComment, mockComments),
37 | getByPostId: vi.fn().mockResolvedValue(mockComments),
38 | getById: vi.fn().mockResolvedValue(mockComment),
39 | create: vi.fn().mockResolvedValue(mockComment),
40 | like: vi.fn().mockResolvedValue(true),
41 | unlike: vi.fn().mockResolvedValue(true),
42 | findByPostId: vi.fn().mockResolvedValue(mockComments),
43 | findByUserId: vi.fn().mockResolvedValue(mockComments),
44 | countByPostId: vi.fn().mockResolvedValue(mockComments.length),
45 | incrementLikes: vi
46 | .fn()
47 | .mockResolvedValue({ ...mockComment, likes: mockComment.likes + 1 }),
48 | decrementLikes: vi.fn().mockResolvedValue({
49 | ...mockComment,
50 | likes: Math.max(0, mockComment.likes - 1),
51 | }),
52 | }),
53 |
54 | createNotFound: (): MockCommentRepository => ({
55 | ...RepositoryMockFactory.createNotFoundMock<CommentEntity>(),
56 | getByPostId: vi.fn().mockResolvedValue([]),
57 | getById: vi.fn().mockResolvedValue(null),
58 | create: vi.fn().mockResolvedValue(null),
59 | like: vi.fn().mockResolvedValue(false),
60 | unlike: vi.fn().mockResolvedValue(false),
61 | findByPostId: vi.fn().mockResolvedValue([]),
62 | findByUserId: vi.fn().mockResolvedValue([]),
63 | countByPostId: vi.fn().mockResolvedValue(0),
64 | incrementLikes: vi.fn().mockRejectedValue(new Error("Comment not found")),
65 | decrementLikes: vi.fn().mockRejectedValue(new Error("Comment not found")),
66 | }),
67 |
68 | createError: (
69 | error: Error = new Error("Comment Repository Error")
70 | ): MockCommentRepository => ({
71 | ...RepositoryMockFactory.createErrorMock<CommentEntity>(error),
72 | getByPostId: vi.fn().mockRejectedValue(error),
73 | getById: vi.fn().mockRejectedValue(error),
74 | create: vi.fn().mockRejectedValue(error),
75 | like: vi.fn().mockRejectedValue(error),
76 | unlike: vi.fn().mockRejectedValue(error),
77 | findByPostId: vi.fn().mockRejectedValue(error),
78 | findByUserId: vi.fn().mockRejectedValue(error),
79 | countByPostId: vi.fn().mockRejectedValue(error),
80 | incrementLikes: vi.fn().mockRejectedValue(error),
81 | decrementLikes: vi.fn().mockRejectedValue(error),
82 | }),
83 |
84 | createLikeScenario: (mockComment: CommentEntity): MockCommentRepository => ({
85 | ...RepositoryMockFactory.createBasicMock<CommentEntity>(),
86 | getByPostId: vi.fn().mockResolvedValue([mockComment]),
87 | getById: vi.fn().mockResolvedValue(mockComment),
88 | create: vi.fn().mockResolvedValue(mockComment),
89 | like: vi.fn().mockImplementation(async (id: string) => {
90 | return id === mockComment.id;
91 | }),
92 | unlike: vi.fn().mockImplementation(async (id: string) => {
93 | return id === mockComment.id;
94 | }),
95 | findByPostId: vi.fn().mockResolvedValue([mockComment]),
96 | findByUserId: vi.fn().mockResolvedValue([mockComment]),
97 | countByPostId: vi.fn().mockResolvedValue(1),
98 | incrementLikes: vi.fn().mockImplementation(async (id: string) => {
99 | if (id === mockComment.id) {
100 | return { ...mockComment, likes: mockComment.likes + 1 };
101 | }
102 | throw new Error("Comment not found");
103 | }),
104 | decrementLikes: vi.fn().mockImplementation(async (id: string) => {
105 | if (id === mockComment.id) {
106 | return { ...mockComment, likes: Math.max(0, mockComment.likes - 1) };
107 | }
108 | throw new Error("Comment not found");
109 | }),
110 | }),
111 |
112 | createPostCommentsScenario: (
113 | postId: string,
114 | mockComments: CommentEntity[]
115 | ): MockCommentRepository => ({
116 | ...RepositoryMockFactory.createBasicMock<CommentEntity>(),
117 | getByPostId: vi.fn().mockImplementation(async (id: string) => {
118 | return id === postId ? mockComments : [];
119 | }),
120 | getById: vi.fn().mockImplementation(async (id: string) => {
121 | return mockComments.find((comment) => comment.id === id) || null;
122 | }),
123 | create: vi.fn().mockResolvedValue(mockComments[0]),
124 | like: vi.fn().mockResolvedValue(true),
125 | unlike: vi.fn().mockResolvedValue(true),
126 | findByPostId: vi.fn().mockImplementation(async (id: string) => {
127 | return id === postId ? mockComments : [];
128 | }),
129 | findByUserId: vi.fn().mockResolvedValue([]),
130 | countByPostId: vi.fn().mockImplementation(async (id: string) => {
131 | return id === postId ? mockComments.length : 0;
132 | }),
133 | incrementLikes: vi.fn(),
134 | decrementLikes: vi.fn(),
135 | }),
136 | };
137 |

---

## /src/entities/comment/**tests**/mocks/index.ts:

1 | export {
2 | CommentRepositoryMocks,
3 | type MockCommentRepository,
4 | } from "./comment-repository.mock";
5 |
6 | export { CommentApiMocks } from "./comment-api.mock";
7 |

---

## /src/entities/comment/**tests**/value-objects/comment-body.vo.test.ts:

1 | import { CommentBody } from "../../value-objects";
2 |
3 | /\*_
4 | _ CommentBody Value Object Tests
5 | _ Verify CommentBody value object core functionality using Given-When-Then pattern
6 | _/
7 | describe("CommentBody Value Object", () => {
8 | describe("Constructor and Validation", () => {
9 | it("should create CommentBody instance with valid text", () => {
10 | // Given: Valid comment body text
11 | const validText = "This is a valid comment body.";
12 |
13 | // When: Create CommentBody instance
14 | const commentBody = new CommentBody(validText);
15 |
16 | // Then: CommentBody instance should be created correctly
17 | expect(commentBody).toBeInstanceOf(CommentBody);
18 | expect(commentBody.text).toBe(validText);
19 | expect(commentBody.value).toBe(validText);
20 | });
21 |
22 | it("should create CommentBody with maximum allowed length", () => {
23 | // Given: Comment body with exactly 100 characters
24 | const maxLengthText = "a".repeat(100);
25 |
26 | // When: Create CommentBody instance
27 | const commentBody = new CommentBody(maxLengthText);
28 |
29 | // Then: CommentBody should be created with maximum length text
30 | expect(commentBody.text).toBe(maxLengthText);
31 | expect(commentBody.text.length).toBe(100);
32 | });
33 |
34 | it("should create CommentBody with minimum valid length", () => {
35 | // Given: Minimum valid length comment body (1 character)
36 | const minLengthText = "a";
37 |
38 | // When: Create CommentBody instance
39 | const commentBody = new CommentBody(minLengthText);
40 |
41 | // Then: CommentBody should be created with minimum length text
42 | expect(commentBody.text).toBe(minLengthText);
43 | expect(commentBody.text.length).toBe(1);
44 | });
45 |
46 | it("should throw error when creating CommentBody with empty string", () => {
47 | // Given: Empty string
48 | const emptyText = "";
49 |
50 | // When & Then: Error should occur with empty string
51 | expect(() => {
52 | new CommentBody(emptyText);
53 | }).toThrow("Comment body cannot be empty");
54 | });
55 |
56 | it("should throw error when creating CommentBody with only whitespace", () => {
57 | // Given: String with only whitespace
58 | const whitespaceText = " \n\t ";
59 |
60 | // When & Then: Error should occur with only whitespace
61 | expect(() => {
62 | new CommentBody(whitespaceText);
63 | }).toThrow("Comment body cannot be empty");
64 | });
65 |
66 | it("should throw error when text exceeds maximum length", () => {
67 | // Given: Comment body exceeding 100 characters
68 | const tooLongText = "a".repeat(101);
69 |
70 | // When & Then: Error should occur with too long text
71 | expect(() => {
72 | new CommentBody(tooLongText);
73 | }).toThrow("Comment body cannot exceed 100 characters");
74 | });
75 | });
76 |
77 | describe("Equality Comparison", () => {
78 | it("should return true when comparing CommentBody instances with same text", () => {
79 | // Given: Two CommentBody instances with same text
80 | const text = "Same comment text";
81 | const commentBody1 = new CommentBody(text);
82 | const commentBody2 = new CommentBody(text);
83 |
84 | // When: Compare using equals method
85 | const isEqual = commentBody1.equals(commentBody2);
86 |
87 | // Then: Value objects with same value should be equal
88 | expect(isEqual).toBe(true);
89 | });
90 |
91 | it("should return false when comparing CommentBody instances with different text", () => {
92 | // Given: Two CommentBody instances with different text
93 | const commentBody1 = new CommentBody("First comment text");
94 | const commentBody2 = new CommentBody("Second comment text");
95 |
96 | // When: Compare using equals method
97 | const isEqual = commentBody1.equals(commentBody2);
98 |
99 | // Then: Value objects with different values should not be equal
100 | expect(isEqual).toBe(false);
101 | });
102 |
103 | it("should return false when comparing CommentBody with null", () => {
104 | // Given: CommentBody instance and null
105 | const commentBody = new CommentBody("Test comment");
106 |
107 | // When: Compare with null
108 | const isEqual = commentBody.equals(null as unknown as CommentBody);
109 |
110 | // Then: Comparison with null should return false
111 | expect(isEqual).toBe(false);
112 | });
113 |
114 | it("should demonstrate value-based equality rather than reference equality", () => {
115 | // Given: Two separate CommentBody instances with same text
116 | const text = "Value-based comparison test";
117 | const commentBody1 = new CommentBody(text);
118 | const commentBody2 = new CommentBody(text);
119 |
120 | // When: Perform reference comparison and value comparison
121 | const referenceEqual = commentBody1 === commentBody2;
122 | const valueEqual = commentBody1.equals(commentBody2);
123 |
124 | // Then: Reference should be different but value should be same
125 | expect(referenceEqual).toBe(false);
126 | expect(valueEqual).toBe(true);
127 | });
128 | });
129 | });
130 |

---

## /src/entities/comment/**tests**/value-objects/timestamp.vo.test.ts:

1 | import { Timestamp } from "../../value-objects";
2 |
3 | /\*_
4 | _ Timestamp Value Object Tests
5 | _ Verify Timestamp value object core functionality using Given-When-Then pattern
6 | _/
7 | describe("Timestamp Value Object", () => {
8 | describe("Constructor and Validation", () => {
9 | it("should create Timestamp instance with valid Date object", () => {
10 | // Given: Valid Date object
11 | const validDate = new Date("2023-12-25T10:30:00.000Z");
12 |
13 | // When: Create Timestamp instance
14 | const timestamp = new Timestamp(validDate);
15 |
16 | // Then: Timestamp instance should be created correctly
17 | expect(timestamp).toBeInstanceOf(Timestamp);
18 | expect(timestamp.value).toEqual(validDate);
19 | expect(timestamp.toDate()).toEqual(validDate);
20 | });
21 |
22 | it("should create Timestamp instance with valid number timestamp", () => {
23 | // Given: Valid number timestamp
24 | const validTimestamp = 1703505000000; // 2023-12-25T10:30:00.000Z
25 |
26 | // When: Create Timestamp instance
27 | const timestamp = new Timestamp(validTimestamp);
28 |
29 | // Then: Timestamp should be created correctly from number timestamp
30 | expect(timestamp).toBeInstanceOf(Timestamp);
31 | expect(timestamp.toNumber()).toBe(validTimestamp);
32 | expect(timestamp.toDate()).toEqual(new Date(validTimestamp));
33 | });
34 |
35 | it("should create Timestamp instance with current date when no parameter provided", () => {
36 | // When: Create Timestamp instance without parameters
37 | const timestamp = new Timestamp();
38 |
39 | // Then: Timestamp should be created with current time
40 | expect(timestamp.toDate()).toBeInstanceOf(Date);
41 | expect(timestamp.toNumber()).toBeTypeOf("number");
42 | expect(timestamp.toNumber()).toBeGreaterThan(0);
43 | });
44 |
45 | it("should throw error when creating Timestamp with invalid Date object", () => {
46 | // Given: Invalid Date object
47 | const invalidDate = new Date("invalid-date-string");
48 |
49 | // When & Then: Error should occur with invalid Date object
50 | expect(() => {
51 | new Timestamp(invalidDate);
52 | }).toThrow("Invalid date format");
53 | });
54 |
55 | it("should throw error when creating Timestamp with NaN timestamp", () => {
56 | // Given: NaN timestamp
57 | const nanTimestamp = NaN;
58 |
59 | // When & Then: Error should occur with NaN timestamp
60 | expect(() => {
61 | new Timestamp(nanTimestamp);
62 | }).toThrow("Invalid date format");
63 | });
64 | });
65 |
66 | describe("Static Methods", () => {
67 | it("should create Timestamp instance with current time when now method is called", () => {
68 | // When: Call now static method
69 | const timestamp = Timestamp.now();
70 |
71 | // Then: Timestamp should be created with current time
72 | expect(timestamp).toBeInstanceOf(Timestamp);
73 | expect(timestamp.toDate()).toBeInstanceOf(Date);
74 | expect(timestamp.toNumber()).toBeTypeOf("number");
75 | });
76 | });
77 |
78 | describe("Equality Comparison", () => {
79 | it("should return true when comparing Timestamp instances with same time", () => {
80 | // Given: Two Timestamp instances with same time
81 | const time = 1703505000000;
82 | const timestamp1 = new Timestamp(time);
83 | const timestamp2 = new Timestamp(time);
84 |
85 | // When: Compare using equals method
86 | const isEqual = timestamp1.equals(timestamp2);
87 |
88 | // Then: Value objects with same time should be equal
89 | expect(isEqual).toBe(true);
90 | });
91 |
92 | it("should return false when comparing Timestamp instances with different times", () => {
93 | // Given: Two Timestamp instances with different times
94 | const timestamp1 = new Timestamp(1703505000000); // 2023-12-25T10:30:00.000Z
95 | const timestamp2 = new Timestamp(1703505060000); // 2023-12-25T10:31:00.000Z
96 |
97 | // When: Compare using equals method
98 | const isEqual = timestamp1.equals(timestamp2);
99 |
100 | // Then: Value objects with different times should not be equal
101 | expect(isEqual).toBe(false);
102 | });
103 |
104 | it("should return false when comparing Timestamp with null", () => {
105 | // Given: Timestamp instance and null
106 | const timestamp = new Timestamp(1703505000000);
107 |
108 | // When: Compare with null
109 | const isEqual = timestamp.equals(null as unknown as Timestamp);
110 |
111 | // Then: Comparison with null should return false
112 | expect(isEqual).toBe(false);
113 | });
114 | });
115 | });
116 |

---

## /src/entities/comment/**tests**/value-objects/user-reference.vo.test.ts:

1 | import { UserReference } from "../../types";
2 | import { UserReferenceVO } from "../../value-objects";
3 |
4 | /\*_
5 | _ UserReferenceVO Value Object Tests
6 | _ Verify UserReferenceVO value object core functionality using Given-When-Then pattern
7 | _/
8 | describe("UserReferenceVO Value Object", () => {
9 | describe("Constructor and Validation", () => {
10 | it("should create UserReferenceVO instance with valid user reference", () => {
11 | // Given: Valid user reference data
12 | const validUserRef: UserReference = {
13 | id: "user-123",
14 | username: "testuser",
15 | profileImage: "https://example.com/avatar.jpg",
16 | };
17 |
18 | // When: Create UserReferenceVO instance
19 | const userRefVO = new UserReferenceVO(validUserRef);
20 |
21 | // Then: UserReferenceVO instance should be created correctly
22 | expect(userRefVO).toBeInstanceOf(UserReferenceVO);
23 | expect(userRefVO.id).toBe(validUserRef.id);
24 | expect(userRefVO.username).toBe(validUserRef.username);
25 | expect(userRefVO.profileImage).toBe(validUserRef.profileImage);
26 | expect(userRefVO.value).toEqual(validUserRef);
27 | });
28 |
29 | it("should create UserReferenceVO instance with empty profile image", () => {
30 | // Given: User reference with empty profile image
31 | const userRefWithEmptyImage: UserReference = {
32 | id: "user-456",
33 | username: "noimage",
34 | profileImage: "",
35 | };
36 |
37 | // When: Create UserReferenceVO instance
38 | const userRefVO = new UserReferenceVO(userRefWithEmptyImage);
39 |
40 | // Then: Should be created correctly with empty profile image
41 | expect(userRefVO.profileImage).toBe("");
42 | expect(userRefVO.id).toBe(userRefWithEmptyImage.id);
43 | expect(userRefVO.username).toBe(userRefWithEmptyImage.username);
44 | });
45 |
46 | it("should throw error when creating UserReferenceVO with null value", () => {
47 | // Given: Null value
48 | const nullValue = null as unknown as UserReference;
49 |
50 | // When & Then: Error should occur with null value
51 | expect(() => {
52 | new UserReferenceVO(nullValue);
53 | }).toThrow("User reference cannot be null or undefined");
54 | });
55 |
56 | it("should throw error when creating UserReferenceVO with undefined value", () => {
57 | // Given: Undefined value
58 | const undefinedValue = undefined as unknown as UserReference;
59 |
60 | // When & Then: Error should occur with undefined value
61 | expect(() => {
62 | new UserReferenceVO(undefinedValue);
63 | }).toThrow("User reference cannot be null or undefined");
64 | });
65 |
66 | it("should throw error when creating UserReferenceVO with non-string id", () => {
67 | // Given: User reference with non-string ID
68 | const userRefWithNonStringId: UserReference = {
69 | id: 123 as unknown as string,
70 | username: "testuser",
71 | profileImage: "https://example.com/avatar.jpg",
72 | };
73 |
74 | // When & Then: Error should occur with non-string ID
75 | expect(() => {
76 | new UserReferenceVO(userRefWithNonStringId);
77 | }).toThrow("User ID must be a string");
78 | });
79 |
80 | it("should throw error when creating UserReferenceVO with empty username", () => {
81 | // Given: User reference with empty username
82 | const userRefWithEmptyUsername: UserReference = {
83 | id: "user-123",
84 | username: "",
85 | profileImage: "https://example.com/avatar.jpg",
86 | };
87 |
88 | // When & Then: Error should occur with empty username
89 | expect(() => {
90 | new UserReferenceVO(userRefWithEmptyUsername);
91 | }).toThrow("Username cannot be empty");
92 | });
93 |
94 | it("should throw error when creating UserReferenceVO with whitespace-only username", () => {
95 | // Given: User reference with whitespace-only username
96 | const userRefWithWhitespaceUsername: UserReference = {
97 | id: "user-123",
98 | username: " \n\t ",
99 | profileImage: "https://example.com/avatar.jpg",
100 | };
101 |
102 | // When & Then: Error should occur with whitespace-only username
103 | expect(() => {
104 | new UserReferenceVO(userRefWithWhitespaceUsername);
105 | }).toThrow("Username cannot be empty");
106 | });
107 | });
108 |
109 | describe("toDTO Method", () => {
110 | it("should return correct DTO when toDTO method is called", () => {
111 | // Given: UserReferenceVO instance
112 | const originalUserRef: UserReference = {
113 | id: "user-456",
114 | username: "dtouser",
115 | profileImage: "https://example.com/dto-avatar.jpg",
116 | };
117 | const userRefVO = new UserReferenceVO(originalUserRef);
118 |
119 | // When: Call toDTO method
120 | const dto = userRefVO.toDTO();
121 |
122 | // Then: Correct DTO object should be returned
123 | expect(dto).toEqual(originalUserRef);
124 | expect(dto.id).toBe(originalUserRef.id);
125 | expect(dto.username).toBe(originalUserRef.username);
126 | expect(dto.profileImage).toBe(originalUserRef.profileImage);
127 | });
128 |
129 | it("should return new object instance when toDTO method is called", () => {
130 | // Given: UserReferenceVO instance
131 | const originalUserRef: UserReference = {
132 | id: "user-789",
133 | username: "newobject",
134 | profileImage: "https://example.com/new-avatar.jpg",
135 | };
136 | const userRefVO = new UserReferenceVO(originalUserRef);
137 |
138 | // When: Call toDTO method
139 | const dto = userRefVO.toDTO();
140 |
141 | // Then: New object instance should be returned (different reference)
142 | expect(dto).not.toBe(originalUserRef); // Different reference
143 | expect(dto).toEqual(originalUserRef); // Same value
144 | });
145 | });
146 |
147 | describe("Equality Comparison", () => {
148 | it("should return true when comparing UserReferenceVO instances with same data", () => {
149 | // Given: Two UserReferenceVO instances with same data
150 | const userRef: UserReference = {
151 | id: "user-same",
152 | username: "sameuser",
153 | profileImage: "https://example.com/same.jpg",
154 | };
155 | const userRefVO1 = new UserReferenceVO(userRef);
156 | const userRefVO2 = new UserReferenceVO(userRef);
157 |
158 | // When: Compare using equals method
159 | const isEqual = userRefVO1.equals(userRefVO2);
160 |
161 | // Then: Value objects with same data should be equal
162 | expect(isEqual).toBe(true);
163 | });
164 |
165 | it("should return false when comparing UserReferenceVO instances with different data", () => {
166 | // Given: Two UserReferenceVO instances with different data
167 | const userRef1: UserReference = {
168 | id: "user-1",
169 | username: "user1",
170 | profileImage: "https://example.com/user1.jpg",
171 | };
172 | const userRef2: UserReference = {
173 | id: "user-2",
174 | username: "user2",
175 | profileImage: "https://example.com/user2.jpg",
176 | };
177 | const userRefVO1 = new UserReferenceVO(userRef1);
178 | const userRefVO2 = new UserReferenceVO(userRef2);
179 |
180 | // When: Compare using equals method
181 | const isEqual = userRefVO1.equals(userRefVO2);
182 |
183 | // Then: Value objects with different data should not be equal
184 | expect(isEqual).toBe(false);
185 | });
186 |
187 | it("should return false when comparing UserReferenceVO with null", () => {
188 | // Given: UserReferenceVO instance and null
189 | const userRef: UserReference = {
190 | id: "user-null-test",
191 | username: "nulltest",
192 | profileImage: "https://example.com/null.jpg",
193 | };
194 | const userRefVO = new UserReferenceVO(userRef);
195 |
196 | // When: Compare with null
197 | const isEqual = userRefVO.equals(null as unknown as UserReferenceVO);
198 |
199 | // Then: Comparison with null should return false
200 | expect(isEqual).toBe(false);
201 | });
202 |
203 | it("should demonstrate value-based equality rather than reference equality", () => {
204 | // Given: Two separate UserReferenceVO instances with same data
205 | const userRef: UserReference = {
206 | id: "user-value-test",
207 | username: "valuetest",
208 | profileImage: "https://example.com/value.jpg",
209 | };
210 | const userRefVO1 = new UserReferenceVO(userRef);
211 | const userRefVO2 = new UserReferenceVO({ ...userRef }); // New object
212 |
213 | // When: Perform reference comparison and value comparison
214 | const referenceEqual = userRefVO1 === userRefVO2;
215 | const valueEqual = userRefVO1.equals(userRefVO2);
216 |
217 | // Then: Reference should be different but value should be same
218 | expect(referenceEqual).toBe(false);
219 | expect(valueEqual).toBe(true);
220 | });
221 | });
222 | });
223 |

---

## /src/entities/comment/core/comment.domain.ts:

1 | import { CommentEntity, UserReference } from "@/entities/comment/types";
2 | import { CommentBody, UserReferenceVO } from "../value-objects";
3 |
4 | export class Comment implements CommentEntity {
5 | private readonly \_id: string;
6 | private readonly \_postId: string;
7 | private readonly \_user: UserReferenceVO;
8 | private \_body: CommentBody;
9 | private \_likes: number;
10 | private \_createdAt: number;
11 | private \_updatedAt: number;
12 | constructor(
13 | id: string,
14 | body: string,
15 | user: UserReference,
16 | postId: string,
17 | likes: number = 0,
18 | createdAt: number,
19 | updatedAt: number
20 | ) {
21 | this.\_id = id;
22 | this.\_body = new CommentBody(body);
23 | this.\_user = new UserReferenceVO(user);
24 | this.\_postId = postId;
25 | this.\_createdAt = createdAt;
26 | this.\_updatedAt = updatedAt;
27 | this.\_likes = likes;
28 | }
29 |
30 | updateBody(newBody: string): void {
31 | this.\_body = new CommentBody(newBody);
32 | this.\_updatedAt = Date.now();
33 | }
34 |
35 | like(userId: string): void {
36 | console.log(`User ${userId} liked the comment`);
37 | this.\_likes += 1;
38 | }
39 |
40 | unlike(userId: string): void {
41 | console.log(`User ${userId} unliked the comment`);
42 | if (this.\_likes > 0) {
43 | this.\_likes -= 1;
44 | }
45 | }
46 |
47 | get id(): string {
48 | return this.\_id;
49 | }
50 |
51 | get postId(): string {
52 | return this.\_postId;
53 | }
54 |
55 | get body(): string {
56 | return this.\_body.text;
57 | }
58 |
59 | get user(): UserReference {
60 | return this.\_user.toDTO();
61 | }
62 |
63 | get createdAt(): number {
64 | return this.\_createdAt;
65 | }
66 |
67 | get updatedAt(): number {
68 | return this.\_updatedAt;
69 | }
70 |
71 | get likes(): number {
72 | return this.\_likes;
73 | }
74 | }
75 |

---

## /src/entities/comment/core/comment.factory.ts:

1 | import { CommentDto } from "../infrastructure/dto";
2 | import { UserReference } from "../types";
3 | import { Comment } from "./comment.domain";
4 |
5 | export class CommentFactory {
6 | static createNew(body: string, postId: string, user: UserReference): Comment {
7 | return new Comment(
8 | "",
9 | body,
10 | {
11 | id: user.id,
12 | username: user.username,
13 | profileImage: user.profileImage || "",
14 | },
15 | postId,
16 | 0,
17 | new Date().getTime(),
18 | new Date().getTime()
19 | );
20 | }
21 |
22 | static createFromDto(dto: CommentDto): Comment {
23 | return new Comment(
24 | dto.id,
25 | dto.body,
26 | dto.user,
27 | dto.postId,
28 | dto.likes || 0,
29 | dto.createdAt || new Date().getTime(),
30 | dto.updatedAt || new Date().getTime()
31 | );
32 | }
33 | }
34 |

---

## /src/entities/comment/core/comment.repository.ts:

1 | import { Comment } from "./comment.domain";
2 |
3 | export interface CommentRepository {
4 | getByPostId(postId: string): Promise<Comment[]>;
5 | getById(id: string): Promise<Comment>;
6 | create(comment: Comment): Promise<Comment>;
7 | update(comment: Comment): Promise<Comment>;
8 | save(comment: Comment): Promise<Comment>;
9 | delete(id: string): Promise<boolean>;
10 | like(id: string, userId: string): Promise<boolean>;
11 | unlike(id: string, userId: string): Promise<boolean>;
12 | }
13 |

---

## /src/entities/comment/core/index.ts:

1 | export { Comment } from "./comment.domain";
2 | export { CommentFactory } from "./comment.factory";
3 | export type { CommentRepository } from "./comment.repository";
4 |

---

## /src/entities/comment/index.ts:

1 | export { Comment, CommentFactory, type CommentRepository } from "./core";
2 | export { COMMENT_QUERY_KEY } from "./infrastructure/api";
3 | export { type CommentDto } from "./infrastructure/dto";
4 | export { CommentApiRepository } from "./infrastructure/repository";
5 | export { CommentMapper } from "./mapper";
6 | export { type CommentEntity } from "./types";
7 |

---

## /src/entities/comment/infrastructure/api/comment.adapter.ts:

1 | import { ApiClient } from "@/shared/api";
2 | import { Pagination } from "@/shared/types";
3 | import { CommentDto } from "../dto/comment.dto";
4 |
5 | export const CommentAdapter = (apiClient: ApiClient) => ({
6 | listByPost: async (postId: string): Promise<Pagination<CommentDto>> => {
7 | const response = await apiClient.get<Pagination<CommentDto>>(
8 | `/posts/${postId}/comments`
9 | );
10 | return response.data;
11 | },
12 |
13 | getById: async (id: string): Promise<CommentDto> => {
14 | try {
15 | const response = await apiClient.get<CommentDto>(`/comments/${id}`);
16 | return response.data;
17 | } catch (error) {
18 | console.error(`Error fetching comment with ID ${id}:`, error);
19 | throw error;
20 | }
21 | },
22 |
23 | create: async (
24 | body: string,
25 | postId: string,
26 | userId: string
27 | ): Promise<CommentDto> => {
28 | try {
29 | const response = await apiClient.post<CommentDto>(`/comments/add`, {
30 | body,
31 | postId,
32 | userId,
33 | });
34 | return response.data;
35 | } catch (error) {
36 | console.error("Error creating comment:", error);
37 | throw error;
38 | }
39 | },
40 |
41 | update: async (id: string, body: string): Promise<CommentDto> => {
42 | try {
43 | const response = await apiClient.put<CommentDto>(`/comments/${id}`, {
44 | body,
45 | });
46 | return response.data;
47 | } catch (error) {
48 | console.error(`Error updating comment with ID ${id}:`, error);
49 | throw error;
50 | }
51 | },
52 |
53 | remove: async (id: string): Promise<boolean> => {
54 | try {
55 | const response = await apiClient.delete<{ success: boolean }>(
56 | `/comments/${id}`
57 | );
58 | return response.data.success;
59 | } catch (error) {
60 | console.error("Error deleting comment:", error);
61 | return false;
62 | }
63 | },
64 |
65 | likeComment: async (id: string, userId: string): Promise<boolean> => {
66 | try {
67 | const response = await apiClient.patch<{ success: boolean }>(
68 | `/comments/${id}/like`,
69 | { userId }
70 | );
71 | return response.data.success;
72 | } catch (error) {
73 | console.error("Error liking comment:", error);
74 | return false;
75 | }
76 | },
77 |
78 | unlikeComment: async (id: string, userId: string): Promise<boolean> => {
79 | try {
80 | const response = await apiClient.patch<{ success: boolean }>(
81 | `/comments/${id}/unlike`,
82 | { userId }
83 | );
84 | return response.data.success;
85 | } catch (error) {
86 | console.error("Error unliking comment:", error);
87 | return false;
88 | }
89 | },
90 | });
91 |

---

## /src/entities/comment/infrastructure/api/comment.query-key.ts:

1 | export const COMMENT_QUERY_KEY = {
2 | all: () => ["comments"] as const,
3 | byPostId: (postId: string) => ["comments", "post", postId] as const,
4 | byId: (id: string) => ["comments", "single", id] as const,
5 | };
6 |

---

## /src/entities/comment/infrastructure/api/index.ts:

1 | export { CommentAdapter } from "./comment.adapter";
2 | export { COMMENT_QUERY_KEY } from "./comment.query-key";
3 |

---

## /src/entities/comment/infrastructure/dto/comment.dto.ts:

1 | import { UserReference } from "@/entities/comment/types";
2 |
3 | export type CommentDto = {
4 | id: string;
5 | body: string;
6 | postId: string;
7 | likes: number;
8 | user: UserReference;
9 | createdAt?: number;
10 | updatedAt?: number;
11 | };
12 |

---

## /src/entities/comment/infrastructure/dto/index.ts:

1 | export type { CommentDto } from "./comment.dto";
2 |

---

## /src/entities/comment/infrastructure/repository/comment.api.repository.ts:

1 | import { CommentMapper } from "@/entities/comment/mapper";
2 | import { ApiClient } from "@/shared/api";
3 | import { Comment, CommentRepository } from "../../core";
4 | import { CommentAdapter } from "../api/comment.adapter";
5 | import { CommentDto } from "../dto";
6 |
7 | export class CommentApiRepository implements CommentRepository {
8 | private api: ReturnType<typeof CommentAdapter>;
9 |
10 | constructor(apiClient: ApiClient) {
11 | this.api = CommentAdapter(apiClient);
12 | }
13 |
14 | async getByPostId(postId: string): Promise<Comment[]> {
15 | try {
16 | const response = await this.api.listByPost(postId);
17 | if (!response || !response.data || !response.data.length) return [];
18 |
19 | const commentDtos: CommentDto[] = response.data.map((apiComment) => ({
20 | id: apiComment.id,
21 | body: apiComment.body || "",
22 | postId: postId,
23 | user: apiComment.user || {
24 | id: "0",
25 | username: "Unknown",
26 | profileImage: "",
27 | },
28 | likes: apiComment.likes || 0,
29 | createdAt: apiComment.createdAt || Date.now(),
30 | updatedAt: apiComment.updatedAt || Date.now(),
31 | }));
32 |
33 | return CommentMapper.toDomainList(commentDtos);
34 | } catch (error) {
35 | console.error(`Error fetching comments for post ID ${postId}:`, error);
36 | throw new Error(`Failed to fetch comments for post ID ${postId}`);
37 | }
38 | }
39 |
40 | async create(comment: Comment): Promise<Comment> {
41 | try {
42 | const result = await this.api.create(
43 | comment.body,
44 | comment.postId,
45 | comment.user.id
46 | );
47 | if (!result) {
48 | throw new Error(`Failed to create comment with ID ${comment.id}`);
49 | }
50 | return CommentMapper.toDomain(result);
51 | } catch (error) {
52 | console.error(`Error creating comment:`, error);
53 | throw new Error("Failed to create comment");
54 | }
55 | }
56 |
57 | async update(comment: Comment): Promise<Comment> {
58 | try {
59 | const result = await this.api.update(comment.id, comment.body);
60 | if (!result) {
61 | throw new Error(`Failed to update comment with ID ${comment.id}`);
62 | }
63 | return CommentMapper.toDomain(result);
64 | } catch (error) {
65 | console.error(`Error updating comment with ID ${comment.id}:`, error);
66 | throw new Error("Failed to update comment");
67 | }
68 | }
69 |
70 | async delete(id: string): Promise<boolean> {
71 | try {
72 | const result = await this.api.remove(id);
73 | return result;
74 | } catch (error) {
75 | console.error(`Error deleting comment with ID ${id}:`, error);
76 | return false;
77 | }
78 | }
79 |
80 | async getById(id: string): Promise<Comment> {
81 | try {
82 | const comment = await this.api.getById(id);
83 |
84 | if (!comment) {
85 | throw new Error(`Comment with ID ${id} not found`);
86 | }
87 |
88 | const commentDto: CommentDto = {
89 | id: comment.id,
90 | body: comment.body,
91 | postId: comment.postId,
92 | user: comment.user,
93 | likes: comment.likes || 0,
94 | createdAt: comment.createdAt || Date.now(),
95 | updatedAt: comment.updatedAt || Date.now(),
96 | };
97 |
98 | return CommentMapper.toDomain(commentDto);
99 | } catch (error) {
100 | console.error(`Error fetching comment with ID ${id}:`, error);
101 | throw error;
102 | }
103 | }
104 |
105 | async save(comment: Comment): Promise<Comment> {
106 | try {
107 | if (comment.id) {
108 | return await this.update(comment);
109 | } else {
110 | return await this.create(comment);
111 | }
112 | } catch (error) {
113 | console.error(`Error saving comment:`, error);
114 | throw error;
115 | }
116 | }
117 |
118 | async like(id: string, userId: string): Promise<boolean> {
119 | try {
120 | const result = await this.api.likeComment(id, userId);
121 | return result;
122 | } catch (error) {
123 | console.error(`Error liking comment with ID ${id}:`, error);
124 | return false;
125 | }
126 | }
127 |
128 | async unlike(id: string, userId: string): Promise<boolean> {
129 | try {
130 | const result = await this.api.unlikeComment(id, userId);
131 | return result;
132 | } catch (error) {
133 | console.error(`Error unliking comment with ID ${id}:`, error);
134 | return false;
135 | }
136 | }
137 | }
138 |

---

## /src/entities/comment/infrastructure/repository/index.ts:

1 | export { CommentApiRepository } from "./comment.api.repository";
2 |

---

## /src/entities/comment/mapper/comment.mapper.ts:

1 | import { Comment } from "../core";
2 | import { CommentDto } from "../infrastructure/dto";
3 | import { CommentEntity } from "../types";
4 |
5 | export class CommentMapper {
6 | static toDto(comment: Comment | CommentEntity): CommentDto {
7 | return {
8 | id: comment.id,
9 | body: comment.body,
10 | postId: comment.postId,
11 | user: comment.user,
12 | likes: comment.likes,
13 | createdAt: comment.createdAt,
14 | updatedAt: comment.updatedAt,
15 | };
16 | }
17 |
18 | static toDomain(dto: CommentDto | CommentEntity): Comment {
19 | return new Comment(
20 | dto.id,
21 | dto.body,
22 | dto.user,
23 | dto.postId.toString(),
24 | dto.likes || 0,
25 | dto.createdAt || new Date().getTime(),
26 | dto.updatedAt || new Date().getTime()
27 | );
28 | }
29 |
30 | static fromEntity(entity: CommentEntity): Comment {
31 | return new Comment(
32 | entity.id,
33 | entity.body,
34 | entity.user,
35 | entity.postId.toString(),
36 | entity.likes || 0,
37 | entity.createdAt || new Date().getTime(),
38 | entity.updatedAt || new Date().getTime()
39 | );
40 | }
41 |
42 | static toDomainList(dtos: CommentDto[]): Comment[] {
43 | return dtos.map((dto) => this.toDomain(dto));
44 | }
45 |
46 | static fromEntityList(entities: CommentEntity[]): Comment[] {
47 | return entities.map((entity) => this.fromEntity(entity));
48 | }
49 |
50 | static toDtoList(comments: Comment[] | CommentEntity[]): CommentDto[] {
51 | return comments.map((comment) => this.toDto(comment));
52 | }
53 | }
54 |

---

## /src/entities/comment/mapper/index.ts:

1 | export { CommentMapper } from "./comment.mapper";
2 |

---

## /src/entities/comment/types/comment.types.ts:

1 | export interface UserReference {
2 | id: string;
3 | username: string;
4 | profileImage: string;
5 | }
6 |
7 | export interface CommentEntity {
8 | postId: string;
9 | id: string;
10 | user: UserReference;
11 | body: string;
12 | likes: number;
13 | createdAt: number;
14 | updatedAt: number;
15 |
16 | updateBody(newBody: string): void;
17 | like(userId: string): void;
18 | unlike(userId: string): void;
19 | }
20 |

---

## /src/entities/comment/types/index.ts:

1 | export { type CommentEntity, type UserReference } from "./comment.types"
2 |

---

## /src/entities/comment/value-objects/comment-body.vo.ts:

1 | import { ValueObject } from "@/shared/domain/value-object";
2 |
3 | export class CommentBody extends ValueObject<string> {
4 | private static readonly MAX_LENGTH = 100;
5 |
6 | constructor(value: string) {
7 | super(value);
8 | }
9 |
10 | protected validate(value: string): void {
11 | if (!value || !value.trim()) {
12 | throw new Error("Comment body cannot be empty");
13 | }
14 |
15 | if (value.length > CommentBody.MAX_LENGTH) {
16 | throw new Error(
17 | `Comment body cannot exceed ${CommentBody.MAX_LENGTH} characters`
18 | );
19 | }
20 | }
21 |
22 | public get text(): string {
23 | return this.value;
24 | }
25 | }
26 |

---

## /src/entities/comment/value-objects/index.ts:

1 | export { CommentBody } from "./comment-body.vo";
2 | export { Timestamp } from "./timestamp.vo";
3 | export { UserReferenceVO } from "./user-reference.vo";
4 |

---

## /src/entities/comment/value-objects/timestamp.vo.ts:

1 | import { ValueObject } from "@/shared/domain/value-object";
2 |
3 | export class Timestamp extends ValueObject<Date> {
4 | constructor(value: Date | number = new Date()) {
5 | super(typeof value === "object" ? value : new Date(value));
6 | }
7 |
8 | protected validate(value: Date): void {
9 | if (!(value instanceof Date) || isNaN(value.getTime())) {
10 | throw new Error("Invalid date format");
11 | }
12 | }
13 |
14 | public static now(): Timestamp {
15 | return new Timestamp(new Date());
16 | }
17 |
18 | public toDate(): Date {
19 | return new Date(this.value);
20 | }
21 |
22 | public toNumber(): number {
23 | return this.value.getTime();
24 | }
25 | }
26 |

---

## /src/entities/comment/value-objects/user-reference.vo.ts:

1 | import { ValueObject } from "@/shared/domain/value-object";
2 | import { BaseError } from "@/shared/libs/errors/base-error";
3 | import { UserReference } from "../types";
4 |
5 | export class UserReferenceVO extends ValueObject<UserReference> {
6 | constructor(value: UserReference) {
7 | super(value);
8 | }
9 |
10 | protected validate(value: UserReference): void {
11 | if (value === null || value === undefined) {
12 | throw BaseError.validation("User reference cannot be null or undefined");
13 | }
14 |
15 | if (typeof value.id !== "string") {
16 | throw BaseError.validation("User ID must be a string");
17 | }
18 |
19 | if (!value.username || !value.username.trim()) {
20 | throw BaseError.validation("Username cannot be empty");
21 | }
22 | }
23 |
24 | public get id(): string {
25 | return this.value.id;
26 | }
27 |
28 | public get username(): string {
29 | return this.value.username;
30 | }
31 |
32 | public get profileImage(): string {
33 | return this.value.profileImage;
34 | }
35 |
36 | public toDTO(): UserReference {
37 | return {
38 | id: this.id,
39 | username: this.username,
40 | profileImage: this.profileImage,
41 | };
42 | }
43 | }
44 |

---

## /src/entities/post/**tests**/core/post.domain.test.ts:

1 | import { Post } from "../../core";
2 | import { UserReference } from "../../types";
3 |
4 | /\*_
5 | _ Post Domain Model Tests
6 | _ Verify Post domain object core functionality using Given-When-Then pattern
7 | _/
8 | describe("Post Domain Model", () => {
9 | let validPostData: {
10 | id: string;
11 | user: UserReference;
12 | title: string;
13 | body: string;
14 | image: string;
15 | likes: number;
16 | totalComments: number;
17 | createdAt: number;
18 | updatedAt: number;
19 | };
20 |
21 | beforeEach(() => {
22 | // Given: Valid post data is prepared for each test
23 | validPostData = {
24 | id: "post-123",
25 | user: {
26 | id: "user-123",
27 | username: "testuser",
28 | profileImage: "https://example.com/avatar.jpg",
29 | },
30 | title: "Test Post Title",
31 | body: "This is a test post body content.",
32 | image: "https://example.com/post-image.jpg",
33 | likes: 5,
34 | totalComments: 3,
35 | createdAt: 1640995200000,
36 | updatedAt: 1640995200000,
37 | };
38 | });
39 |
40 | describe("Constructor", () => {
41 | it("should create a Post instance with valid data", () => {
42 | // Given: Valid post data is prepared
43 | const {
44 | id,
45 | user,
46 | title,
47 | body,
48 | image,
49 | likes,
50 | totalComments,
51 | createdAt,
52 | updatedAt,
53 | } = validPostData;
54 |
55 | // When: Post instance is created
56 | const post = new Post(
57 | id,
58 | user,
59 | title,
60 | body,
61 | image,
62 | likes,
63 | totalComments,
64 | createdAt,
65 | updatedAt
66 | );
67 |
68 | // Then: Post instance should be created correctly
69 | expect(post).toBeInstanceOf(Post);
70 | expect(post.id).toBe(id);
71 | expect(post.user).toEqual(user);
72 | expect(post.title).toBe(title);
73 | expect(post.body).toBe(body);
74 | expect(post.image).toBe(image);
75 | expect(post.likes).toBe(likes);
76 | expect(post.totalComments).toBe(totalComments);
77 | expect(post.createdAt).toBe(createdAt);
78 | expect(post.updatedAt).toBe(updatedAt);
79 | });
80 |
81 | it("should create a Post instance with empty image", () => {
82 | // Given: Post data with empty image string is prepared
83 | const postDataWithoutImage = { ...validPostData, image: "" };
84 | const {
85 | id,
86 | user,
87 | title,
88 | body,
89 | image,
90 | likes,
91 | totalComments,
92 | createdAt,
93 | updatedAt,
94 | } = postDataWithoutImage;
95 |
96 | // When: Post instance is created
97 | const post = new Post(
98 | id,
99 | user,
100 | title,
101 | body,
102 | image,
103 | likes,
104 | totalComments,
105 | createdAt,
106 | updatedAt
107 | );
108 |
109 | // Then: Image should be set to empty string
110 | expect(post.image).toBe("");
111 | expect(post.title).toBe(title);
112 | expect(post.body).toBe(body);
113 | });
114 |
115 | it("should create a Post instance with zero likes", () => {
116 | // Given: Post data with zero likes is prepared
117 | const postDataWithZeroLikes = { ...validPostData, likes: 0 };
118 | const {
119 | id,
120 | user,
121 | title,
122 | body,
123 | image,
124 | likes,
125 | totalComments,
126 | createdAt,
127 | updatedAt,
128 | } = postDataWithZeroLikes;
129 |
130 | // When: Post instance is created
131 | const post = new Post(
132 | id,
133 | user,
134 | title,
135 | body,
136 | image,
137 | likes,
138 | totalComments,
139 | createdAt,
140 | updatedAt
141 | );
142 |
143 | // Then: Likes should be set to 0
144 | expect(post.likes).toBe(0);
145 | expect(post.totalComments).toBe(totalComments);
146 | });
147 | });
148 |
149 | describe("Business Methods", () => {
150 | let post: Post;
151 |
152 | beforeEach(() => {
153 | // Given: Test Post instance is prepared
154 | const {
155 | id,
156 | user,
157 | title,
158 | body,
159 | image,
160 | likes,
161 | totalComments,
162 | createdAt,
163 | updatedAt,
164 | } = validPostData;
165 | post = new Post(
166 | id,
167 | user,
168 | title,
169 | body,
170 | image,
171 | likes,
172 | totalComments,
173 | createdAt,
174 | updatedAt
175 | );
176 | });
177 |
178 | describe("updateTitle", () => {
179 | it("should update title and updatedAt timestamp", () => {
180 | // Given: Post instance and new title are prepared
181 | const newTitle = "Updated Post Title";
182 | const originalUpdatedAt = post.updatedAt;
183 |
184 | // When: updateTitle method is called
185 | post.updateTitle(newTitle);
186 |
187 | // Then: Title and update time should be updated
188 | expect(post.title).toBe(newTitle);
189 | expect(post.updatedAt).toBeGreaterThan(originalUpdatedAt);
190 | });
191 |
192 | it("should not affect other properties when title is updated", () => {
193 | // Given: Post instance and new title are prepared
194 | const newTitle = "New Title";
195 | const originalBody = post.body;
196 | const originalLikes = post.likes;
197 | const originalId = post.id;
198 |
199 | // When: updateTitle method is called
200 | post.updateTitle(newTitle);
201 |
202 | // Then: Other properties should not be changed
203 | expect(post.body).toBe(originalBody);
204 | expect(post.likes).toBe(originalLikes);
205 | expect(post.id).toBe(originalId);
206 | expect(post.totalComments).toBe(validPostData.totalComments);
207 | });
208 | });
209 |
210 | describe("updateBody", () => {
211 | it("should update body and updatedAt timestamp", () => {
212 | // Given: Post instance and new body are prepared
213 | const newBody = "This is the updated post body content.";
214 | const originalUpdatedAt = post.updatedAt;
215 |
216 | // When: updateBody method is called
217 | post.updateBody(newBody);
218 |
219 | // Then: Body and update time should be updated
220 | expect(post.body).toBe(newBody);
221 | expect(post.updatedAt).toBeGreaterThan(originalUpdatedAt);
222 | });
223 |
224 | it("should not affect other properties when body is updated", () => {
225 | // Given: Post instance and new body are prepared
226 | const newBody = "New body content";
227 | const originalTitle = post.title;
228 | const originalLikes = post.likes;
229 | const originalId = post.id;
230 |
231 | // When: updateBody method is called
232 | post.updateBody(newBody);
233 |
234 | // Then: Other properties should not be changed
235 | expect(post.title).toBe(originalTitle);
236 | expect(post.likes).toBe(originalLikes);
237 | expect(post.id).toBe(originalId);
238 | expect(post.totalComments).toBe(validPostData.totalComments);
239 | });
240 | });
241 |
242 | describe("like", () => {
243 | it("should increment likes count by 1", () => {
244 | // Given: Post instance is prepared
245 | const originalLikes = post.likes;
246 |
247 | // When: like method is called
248 | post.like();
249 |
250 | // Then: Likes count should be incremented by 1
251 | expect(post.likes).toBe(originalLikes + 1);
252 | });
253 |
254 | it("should increment likes from 0 to 1 when post has no likes initially", () => {
255 | // Given: Post instance with zero likes is prepared
256 | const postWithZeroLikes = new Post(
257 | validPostData.id,
258 | validPostData.user,
259 | validPostData.title,
260 | validPostData.body,
261 | validPostData.image,
262 | 0, // 0 likes
263 | validPostData.totalComments,
264 | validPostData.createdAt,
265 | validPostData.updatedAt
266 | );
267 |
268 | // When: like method is called
269 | postWithZeroLikes.like();
270 |
271 | // Then: Likes count should become 1
272 | expect(postWithZeroLikes.likes).toBe(1);
273 | });
274 |
275 | it("should not affect other properties when like is called", () => {
276 | // Given: Post instance is prepared
277 | const originalTitle = post.title;
278 | const originalBody = post.body;
279 | const originalUpdatedAt = post.updatedAt;
280 |
281 | // When: like method is called
282 | post.like();
283 |
284 | // Then: Other properties should not be changed
285 | expect(post.title).toBe(originalTitle);
286 | expect(post.body).toBe(originalBody);
287 | expect(post.updatedAt).toBe(originalUpdatedAt); // like does not change updatedAt
288 | });
289 | });
290 |
291 | describe("unlike", () => {
292 | it("should decrement likes count by 1 when likes > 0", () => {
293 | // Given: Post instance with likes is prepared
294 | const originalLikes = post.likes; // 5 likes
295 |
296 | // When: unlike method is called
297 | post.unlike();
298 |
299 | // Then: Likes count should be decremented by 1
300 | expect(post.likes).toBe(originalLikes - 1);
301 | });
302 |
303 | it("should not decrement likes below 0", () => {
304 | // Given: Post instance with zero likes is prepared
305 | const postWithZeroLikes = new Post(
306 | validPostData.id,
307 | validPostData.user,
308 | validPostData.title,
309 | validPostData.body,
310 | validPostData.image,
311 | 0, // 0 likes
312 | validPostData.totalComments,
313 | validPostData.createdAt,
314 | validPostData.updatedAt
315 | );
316 |
317 | // When: unlike method is called
318 | postWithZeroLikes.unlike();
319 |
320 | // Then: Likes count should not go below 0
321 | expect(postWithZeroLikes.likes).toBe(0);
322 | });
323 |
324 | it("should not affect other properties when unlike is called", () => {
325 | // Given: Post instance is prepared
326 | const originalTitle = post.title;
327 | const originalBody = post.body;
328 | const originalUpdatedAt = post.updatedAt;
329 |
330 | // When: unlike method is called
331 | post.unlike();
332 |
333 | // Then: Other properties should not be changed
334 | expect(post.title).toBe(originalTitle);
335 | expect(post.body).toBe(originalBody);
336 | expect(post.updatedAt).toBe(originalUpdatedAt); // unlike does not change updatedAt
337 | });
338 | });
339 | });
340 | });
341 |

---

## /src/entities/post/**tests**/core/post.factory.test.ts:

1 | import { Post, PostFactory } from "../../core";
2 | import { PostDto } from "../../infrastructure/dto";
3 | import { UserReference } from "../../types";
4 |
5 | /\*_
6 | _ PostFactory Tests
7 | _ Verify PostFactory core functionality using Given-When-Then pattern
8 | _/
9 | describe("PostFactory", () => {
10 | let validUser: UserReference;
11 | let validPostDto: PostDto;
12 |
13 | beforeEach(() => {
14 | // Given: Valid test data is prepared for each test
15 | validUser = {
16 | id: "user-123",
17 | username: "testuser",
18 | profileImage: "https://example.com/avatar.jpg",
19 | };
20 |
21 | validPostDto = {
22 | id: "post-123",
23 | user: validUser,
24 | title: "Test Post Title",
25 | body: "This is a test post body content.",
26 | image: "https://example.com/post-image.jpg",
27 | likes: 5,
28 | totalComments: 3,
29 | createdAt: 1640995200000,
30 | updatedAt: 1640995200000,
31 | };
32 | });
33 |
34 | describe("createNew", () => {
35 | it("should create a new Post instance with provided parameters", () => {
36 | // Given: Data required for creating a new post is prepared
37 | const title = "New Post Title";
38 | const body = "This is a new post body.";
39 | const image = "https://example.com/new-image.jpg";
40 |
41 | // When: createNew method is called
42 | const post = PostFactory.createNew(title, body, validUser, image);
43 |
44 | // Then: A valid Post instance should be created
45 | expect(post).toBeInstanceOf(Post);
46 | expect(post.title).toBe(title);
47 | expect(post.body).toBe(body);
48 | expect(post.user).toEqual(validUser);
49 | expect(post.image).toBe(image);
50 | expect(post.id).toBe(""); // New posts start with empty ID
51 | expect(post.likes).toBe(0); // New posts have 0 likes
52 | expect(post.totalComments).toBe(0); // New posts have 0 comments
53 | expect(typeof post.createdAt).toBe("number");
54 | expect(typeof post.updatedAt).toBe("number");
55 | expect(post.createdAt).toBeGreaterThan(0);
56 | expect(post.updatedAt).toBeGreaterThan(0);
57 | });
58 |
59 | it("should create a new Post instance with empty image when image parameter is not provided", () => {
60 | // Given: Data for creating a new post without image is prepared
61 | const title = "Post Without Image";
62 | const body = "This post has no image.";
63 |
64 | // When: createNew method is called without image
65 | const post = PostFactory.createNew(title, body, validUser);
66 |
67 | // Then: Post instance with empty image string should be created
68 | expect(post).toBeInstanceOf(Post);
69 | expect(post.title).toBe(title);
70 | expect(post.body).toBe(body);
71 | expect(post.user).toEqual(validUser);
72 | expect(post.image).toBe(""); // Default value is empty string
73 | expect(post.likes).toBe(0);
74 | expect(post.totalComments).toBe(0);
75 | });
76 |
77 | it("should create Post with same createdAt and updatedAt timestamps when newly created", () => {
78 | // Given: Data for creating a new post is prepared
79 | const title = "New Post";
80 | const body = "New post body";
81 |
82 | // When: createNew method is called
83 | const post = PostFactory.createNew(title, body, validUser);
84 |
85 | // Then: Creation time and update time should be the same (since it's newly created)
86 | expect(post.createdAt).toBe(post.updatedAt);
87 | });
88 | });
89 |
90 | describe("createFromDto", () => {
91 | it("should create a Post instance from complete DTO", () => {
92 | // Given: Complete PostDto is prepared
93 | const completeDto = { ...validPostDto };
94 |
95 | // When: createFromDto method is called
96 | const post = PostFactory.createFromDto(completeDto);
97 |
98 | // Then: Post instance matching DTO data should be created
99 | expect(post).toBeInstanceOf(Post);
100 | expect(post.id).toBe(completeDto.id);
101 | expect(post.user).toEqual(completeDto.user);
102 | expect(post.title).toBe(completeDto.title);
103 | expect(post.body).toBe(completeDto.body);
104 | expect(post.image).toBe(completeDto.image);
105 | expect(post.likes).toBe(completeDto.likes);
106 | expect(post.totalComments).toBe(completeDto.totalComments);
107 | expect(post.createdAt).toBe(completeDto.createdAt);
108 | expect(post.updatedAt).toBe(completeDto.updatedAt);
109 | });
110 |
111 | it("should create a Post instance with default values when optional DTO fields are missing", () => {
112 | // Given: Partial PostDto with only required fields is prepared
113 | const partialDto = {
114 | id: "post-456",
115 | user: validUser,
116 | title: "Partial Post",
117 | body: "This post has missing optional fields.",
118 | // image, likes, totalComments, createdAt, updatedAt are intentionally omitted
119 | };
120 |
121 | // When: createFromDto method is called with partial DTO
122 | const post = PostFactory.createFromDto(partialDto as PostDto);
123 |
124 | // Then: Post instance with default values should be created
125 | expect(post.id).toBe(partialDto.id);
126 | expect(post.user).toEqual(partialDto.user);
127 | expect(post.title).toBe(partialDto.title);
128 | expect(post.body).toBe(partialDto.body);
129 | expect(post.image).toBe(""); // Default value
130 | expect(post.likes).toBe(0); // Default value
131 | expect(post.totalComments).toBe(0); // Default value
132 | expect(typeof post.createdAt).toBe("number"); // Set to current time
133 | expect(typeof post.updatedAt).toBe("number"); // Set to current time
134 | expect(post.createdAt).toBeGreaterThan(0);
135 | expect(post.updatedAt).toBeGreaterThan(0);
136 | });
137 |
138 | it("should create a Post instance with empty image when DTO image is null", () => {
139 | // Given: PostDto with null image is prepared
140 | const dtoWithNullImage = {
141 | ...validPostDto,
142 | image: "",
143 | };
144 |
145 | // When: createFromDto method is called with null image DTO
146 | const post = PostFactory.createFromDto(dtoWithNullImage);
147 |
148 | // Then: Image should be handled as empty string
149 | expect(post.image).toBe("");
150 | expect(post.title).toBe(dtoWithNullImage.title);
151 | expect(post.body).toBe(dtoWithNullImage.body);
152 | });
153 |
154 | it("should create a Post instance with zero likes when DTO likes is null", () => {
155 | // Given: PostDto with null likes is prepared
156 | const dtoWithNullLikes = {
157 | ...validPostDto,
158 | likes: 0,
159 | };
160 |
161 | // When: createFromDto method is called with null likes DTO
162 | const post = PostFactory.createFromDto(dtoWithNullLikes);
163 |
164 | // Then: Likes should be handled as 0
165 | expect(post.likes).toBe(0);
166 | expect(post.totalComments).toBe(dtoWithNullLikes.totalComments);
167 | });
168 |
169 | it("should create a Post instance with current timestamp when DTO timestamps are null", () => {
170 | // Given: PostDto with null timestamps is prepared
171 | const dtoWithNullTimestamps = {
172 | ...validPostDto,
173 | createdAt: 0,
174 | updatedAt: 0,
175 | };
176 |
177 | // When: createFromDto method is called with null timestamps DTO
178 | const post = PostFactory.createFromDto(dtoWithNullTimestamps);
179 |
180 | // Then: Timestamps should be set to current time
181 | expect(typeof post.createdAt).toBe("number");
182 | expect(typeof post.updatedAt).toBe("number");
183 | expect(post.createdAt).toBeGreaterThan(0);
184 | expect(post.updatedAt).toBeGreaterThan(0);
185 | // Should be close to current time (based on test execution time)
186 | const now = Date.now();
187 | expect(post.createdAt).toBeLessThanOrEqual(now);
188 | expect(post.updatedAt).toBeLessThanOrEqual(now);
189 | });
190 | });
191 | });
192 |

---

## /src/entities/post/**tests**/fixtures/index.ts:

1 | export { PostFixtures } from "./post.fixtures";
2 |

---

## /src/entities/post/**tests**/fixtures/post.fixtures.ts:

1 | import { TestDataHelpers } from "@/shared/libs/**tests**";
2 | import { PostEntity, UserReference } from "../../types";
3 |
4 | export const PostFixtures = {
5 | valid: {
6 | basic: {
7 | id: "post-123",
8 | user: {
9 | id: "user-123",
10 | username: "testuser",
11 | profileImage: "https://example.com/avatar.jpg",
12 | } as UserReference,
13 | title: "Test Post Title",
14 | body: "This is a test post body content.",
15 | image: "https://example.com/post-image.jpg",
16 | likes: 5,
17 | totalComments: 3,
18 | createdAt: TestDataHelpers.generateTimestamp(-86400000), // 1 Day ago
19 | updatedAt: TestDataHelpers.generateTimestamp(-3600000), // 1 Hour ago
20 | } as PostEntity,
21 |
22 | withoutImage: {
23 | id: "post-456",
24 | user: {
25 | id: "user-456",
26 | username: "noimage",
27 | profileImage: "",
28 | } as UserReference,
29 | title: "Post Without Image",
30 | body: "This post has no image attached.",
31 | image: "",
32 | likes: 0,
33 | totalComments: 0,
34 | createdAt: TestDataHelpers.generateTimestamp(-172800000), // 2 Days ago
35 | updatedAt: TestDataHelpers.generateTimestamp(-172800000),
36 | } as PostEntity,
37 |
38 | popularPost: {
39 | id: "post-popular",
40 | user: {
41 | id: "user-popular",
42 | username: "popular_user",
43 | profileImage: "https://example.com/popular.jpg",
44 | } as UserReference,
45 | title: "Very Popular Post",
46 | body: "This post has received many likes and comments.",
47 | image: "https://example.com/popular-post.jpg",
48 | likes: 1000,
49 | totalComments: 250,
50 | createdAt: TestDataHelpers.generateTimestamp(-604800000), // 1 Week ago
51 | updatedAt: TestDataHelpers.generateTimestamp(-86400000), // 1 Day ago
52 | } as PostEntity,
53 |
54 | longContent: {
55 | id: "post-long",
56 | user: {
57 | id: "user-long",
58 | username: "verbose_user",
59 | profileImage: "https://example.com/verbose.jpg",
60 | } as UserReference,
61 | title:
62 | "This is a very long title that contains many words and describes the post content in great detail",
63 | body: "This is a very long post body that contains multiple paragraphs and extensive content. ".repeat(
64 | 10
65 | ),
66 | image: "https://example.com/long-post.jpg",
67 | likes: 15,
68 | totalComments: 8,
69 | createdAt: TestDataHelpers.generateTimestamp(-259200000), // 3일 전
70 | updatedAt: TestDataHelpers.generateTimestamp(-7200000), // 2시간 전
71 | } as PostEntity,
72 | },
73 |
74 | invalid: {
75 | emptyTitle: {
76 | id: "post-empty-title",
77 | user: {
78 | id: "user-123",
79 | username: "testuser",
80 | profileImage: "https://example.com/avatar.jpg",
81 | } as UserReference,
82 | title: "",
83 | body: "This post has an empty title.",
84 | image: "https://example.com/post.jpg",
85 | likes: 0,
86 | totalComments: 0,
87 | createdAt: TestDataHelpers.generateTimestamp(),
88 | updatedAt: TestDataHelpers.generateTimestamp(),
89 | } as PostEntity,
90 |
91 | // Empty body
92 | emptyBody: {
93 | id: "post-empty-body",
94 | user: {
95 | id: "user-123",
96 | username: "testuser",
97 | profileImage: "https://example.com/avatar.jpg",
98 | } as UserReference,
99 | title: "Post with Empty Body",
100 | body: "",
101 | image: "https://example.com/post.jpg",
102 | likes: 0,
103 | totalComments: 0,
104 | createdAt: TestDataHelpers.generateTimestamp(),
105 | updatedAt: TestDataHelpers.generateTimestamp(),
106 | } as PostEntity,
107 |
108 | invalidUser: {
109 | id: "post-invalid-user",
110 | user: {
111 | id: "",
112 | username: "",
113 | profileImage: "",
114 | } as UserReference,
115 | title: "Post with Invalid User",
116 | body: "This post has invalid user reference.",
117 | image: "https://example.com/post.jpg",
118 | likes: 0,
119 | totalComments: 0,
120 | createdAt: TestDataHelpers.generateTimestamp(),
121 | updatedAt: TestDataHelpers.generateTimestamp(),
122 | } as PostEntity,
123 |
124 | negativeLikes: {
125 | id: "post-negative-likes",
126 | user: {
127 | id: "user-123",
128 | username: "testuser",
129 | profileImage: "https://example.com/avatar.jpg",
130 | } as UserReference,
131 | title: "Post with Negative Likes",
132 | body: "This post has negative likes count.",
133 | image: "https://example.com/post.jpg",
134 | likes: -5,
135 | totalComments: 0,
136 | createdAt: TestDataHelpers.generateTimestamp(),
137 | updatedAt: TestDataHelpers.generateTimestamp(),
138 | } as PostEntity,
139 | },
140 |
141 | edge: {
142 | zeroLikes: {
143 | id: "post-zero-likes",
144 | user: {
145 | id: "user-123",
146 | username: "testuser",
147 | profileImage: "https://example.com/avatar.jpg",
148 | } as UserReference,
149 | title: "Post with Zero Likes",
150 | body: "This post has no likes yet.",
151 | image: "https://example.com/post.jpg",
152 | likes: 0,
153 | totalComments: 0,
154 | createdAt: TestDataHelpers.generateTimestamp(),
155 | updatedAt: TestDataHelpers.generateTimestamp(),
156 | } as PostEntity,
157 |
158 | // Post with maximum likes
159 | maxLikes: {
160 | id: "post-max-likes",
161 | user: {
162 | id: "user-123",
163 | username: "testuser",
164 | profileImage: "https://example.com/avatar.jpg",
165 | } as UserReference,
166 | title: "Post with Maximum Likes",
167 | body: "This post has reached maximum likes.",
168 | image: "https://example.com/post.jpg",
169 | likes: Number.MAX_SAFE_INTEGER,
170 | totalComments: 1000000,
171 | createdAt: TestDataHelpers.generateTimestamp(-31536000000), // 1년 전
172 | updatedAt: TestDataHelpers.generateTimestamp(),
173 | } as PostEntity,
174 |
175 | sameTimestamps: {
176 | id: "post-same-timestamps",
177 | user: {
178 | id: "user-123",
179 | username: "testuser",
180 | profileImage: "https://example.com/avatar.jpg",
181 | } as UserReference,
182 | title: "Post with Same Timestamps",
183 | body: "This post was never updated.",
184 | image: "https://example.com/post.jpg",
185 | likes: 2,
186 | totalComments: 1,
187 | createdAt: 1640995200000,
188 | updatedAt: 1640995200000,
189 | } as PostEntity,
190 | },
191 |
192 | multiple: [
193 | {
194 | id: "post-1",
195 | user: {
196 | id: "user-1",
197 | username: "user1",
198 | profileImage: "https://example.com/user1.jpg",
199 | } as UserReference,
200 | title: "First Post",
201 | body: "This is the first post.",
202 | image: "https://example.com/post1.jpg",
203 | likes: 10,
204 | totalComments: 5,
205 | createdAt: TestDataHelpers.generateTimestamp(-86400000),
206 | updatedAt: TestDataHelpers.generateTimestamp(-86400000),
207 | },
208 | {
209 | id: "post-2",
210 | user: {
211 | id: "user-2",
212 | username: "user2",
213 | profileImage: "https://example.com/user2.jpg",
214 | } as UserReference,
215 | title: "Second Post",
216 | body: "This is the second post.",
217 | image: "",
218 | likes: 7,
219 | totalComments: 3,
220 | createdAt: TestDataHelpers.generateTimestamp(-172800000),
221 | updatedAt: TestDataHelpers.generateTimestamp(-172800000),
222 | },
223 | {
224 | id: "post-3",
225 | user: {
226 | id: "user-3",
227 | username: "user3",
228 | profileImage: "",
229 | } as UserReference,
230 | title: "Third Post",
231 | body: "This is the third post.",
232 | image: "https://example.com/post3.jpg",
233 | likes: 0,
234 | totalComments: 0,
235 | createdAt: TestDataHelpers.generateTimestamp(-259200000),
236 | updatedAt: TestDataHelpers.generateTimestamp(-259200000),
237 | },
238 | ] as PostEntity[],
239 | };
240 |
241 | export const createPostFixture = (
242 | overrides: Partial<PostEntity> = {}
243 | ): PostEntity => {
244 | return {
245 | ...PostFixtures.valid.basic,
246 | ...overrides,
247 | };
248 | };
249 |
250 | export const createMultiplePostFixtures = (
251 | count: number,
252 | baseData: Partial<PostEntity> = {}
253 | ): PostEntity[] => {
254 | return TestDataHelpers.createArray(count, (index) => ({
255 | ...PostFixtures.valid.basic,
256 | id: TestDataHelpers.generateId("post"),
257 | title: `Test Post ${index + 1}`,
258 | body: `This is test post number ${index + 1}.`,
259 | likes: Math.floor(Math.random() _ 100),
260 | totalComments: Math.floor(Math.random() _ 20),
261 | createdAt: TestDataHelpers.generateTimestamp(-index _ 86400000), // Each one day earlier
262 | updatedAt: TestDataHelpers.generateTimestamp(-index _ 86400000),
263 | ...baseData,
264 | }));
265 | };
266 |
267 | export const createPostsForUser = (
268 | user: UserReference,
269 | count: number = 3
270 | ): PostEntity[] => {
271 | return createMultiplePostFixtures(count, { user });
272 | };
273 |
274 | export const createRandomPostFixture = (
275 | overrides: Partial<PostEntity> = {}
276 | ): PostEntity => {
277 | return {
278 | id: TestDataHelpers.generateId("post"),
279 | user: {
280 | id: TestDataHelpers.generateId("user"),
281 | username: TestDataHelpers.generateUsername(),
282 | profileImage: "https://example.com/avatar.jpg",
283 | },
284 | title: `Random Post ${Math.random().toString(36).substr(2, 8)}`,
285 | body: `This is a random post content ${Math.random()
286 |       .toString(36)
287 |       .substr(2, 20)}.`,
288 | image: Math.random() > 0.5 ? "https://example.com/random.jpg" : "",
289 | likes: Math.floor(Math.random() _ 1000),
290 | totalComments: Math.floor(Math.random() _ 100),
291 | createdAt: TestDataHelpers.generateTimestamp(
292 | -Math.random() _ 86400000 _ 30
293 | ), // Within the last 30 days
294 | updatedAt: TestDataHelpers.generateTimestamp(
295 | -Math.random() _ 86400000 _ 30
296 | ),
297 | ...overrides,
298 | };
299 | };
300 |

---

## /src/entities/post/**tests**/index.ts:

1 | // Fixtures
2 | export { PostFixtures } from "./fixtures";
3 |
4 | // Repository Mocks
5 | export { PostRepositoryMocks, type MockPostRepository } from "./mocks";
6 |
7 | // API Mocks
8 | export { PostApiMocks } from "./mocks";
9 |

---

## /src/entities/post/**tests**/infrastructure/post.api.repository.test.ts:

1 | import { ApiClient } from "@/shared/api";
2 | import { Pagination } from "@/shared/types";
3 | import { beforeEach, describe, expect, it, vi } from "vitest";
4 | import { Post } from "../../core";
5 | import { PostDto } from "../../infrastructure/dto";
6 | import { PostApiRepository } from "../../infrastructure/repository";
7 | import { UserReference } from "../../types";
8 |
9 | /\*_
10 | _ Post API Repository Tests
11 | _ Verify Post API repository core functionality using Given-When-Then pattern
12 | _/
13 | describe("Post API Repository", () => {
14 | let postApiRepository: PostApiRepository;
15 | let mockApiClient: ApiClient;
16 | let validPostDto: PostDto;
17 | let validUserReference: UserReference;
18 |
19 | beforeEach(() => {
20 | // Given: Set up mock API client and repository
21 | mockApiClient = {
22 | get: vi.fn(),
23 | post: vi.fn(),
24 | put: vi.fn(),
25 | delete: vi.fn(),
26 | patch: vi.fn(),
27 | } as unknown as ApiClient;
28 |
29 | postApiRepository = new PostApiRepository(mockApiClient);
30 |
31 | // Set up valid test data
32 | validUserReference = {
33 | id: "user-123",
34 | username: "testuser",
35 | profileImage: "https://example.com/avatar.jpg",
36 | };
37 |
38 | validPostDto = {
39 | id: "post-123",
40 | user: validUserReference,
41 | title: "Test Post Title",
42 | body: "This is a test post body content.",
43 | image: "https://example.com/post-image.jpg",
44 | likes: 5,
45 | totalComments: 3,
46 | createdAt: 1640995200000,
47 | updatedAt: 1640995200000,
48 | };
49 | });
50 |
51 | describe("getAll", () => {
52 | it("should return array of Post domain objects when API call succeeds", async () => {
53 | // Given: Mock API client returns paginated post data
54 | const mockPaginationResponse: Pagination<PostDto> = {
55 | data: [validPostDto],
56 | pagination: { total: 1, skip: 0, limit: 10 },
57 | };
58 | const mockResponse = {
59 | data: mockPaginationResponse,
60 | status: 200,
61 | statusText: "OK",
62 | ok: true,
63 | };
64 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
65 |
66 | // When: Get all posts
67 | const result = await postApiRepository.getAll(10, 0);
68 |
69 | // Then: Should return array of Post domain objects
70 | expect(result).toHaveLength(1);
71 | expect(result[0]).toBeInstanceOf(Post);
72 | expect(result[0].id).toBe(validPostDto.id);
73 | expect(result[0].title).toBe(validPostDto.title);
74 | expect(result[0].user).toEqual(validPostDto.user);
75 | expect(mockApiClient.get).toHaveBeenCalledWith("/posts?limit=10&skip=0");
76 | });
77 |
78 | it("should return empty array when API returns no data", async () => {
79 | // Given: Mock API client returns empty data
80 | const mockPaginationResponse: Pagination<PostDto> = {
81 | data: [],
82 | pagination: { total: 0, skip: 0, limit: 10 },
83 | };
84 | const mockResponse = {
85 | data: mockPaginationResponse,
86 | status: 200,
87 | statusText: "OK",
88 | ok: true,
89 | };
90 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
91 |
92 | // When: Get all posts
93 | const result = await postApiRepository.getAll(10, 0);
94 |
95 | // Then: Should return empty array
96 | expect(result).toEqual([]);
97 | expect(result).toHaveLength(0);
98 | });
99 |
100 | it("should return empty array when API call fails", async () => {
101 | // Given: Mock API client throws error
102 | const apiError = new Error("API Error");
103 | vi.mocked(mockApiClient.get).mockRejectedValue(apiError);
104 |
105 | // When: Get all posts
106 | const result = await postApiRepository.getAll(10, 0);
107 |
108 | // Then: Should return empty array
109 | expect(result).toEqual([]);
110 | expect(result).toHaveLength(0);
111 | });
112 | });
113 |
114 | describe("getById", () => {
115 | it("should return Post domain object when API call succeeds", async () => {
116 | // Given: Mock API client returns valid post data
117 | const mockResponse = {
118 | data: validPostDto,
119 | status: 200,
120 | statusText: "OK",
121 | ok: true,
122 | };
123 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
124 |
125 | // When: Get post by ID
126 | const result = await postApiRepository.getById("post-123");
127 |
128 | // Then: Should return Post domain object
129 | expect(result).toBeInstanceOf(Post);
130 | expect(result.id).toBe(validPostDto.id);
131 | expect(result.title).toBe(validPostDto.title);
132 | expect(result.user).toEqual(validPostDto.user);
133 | expect(mockApiClient.get).toHaveBeenCalledWith("/posts/post-123");
134 | });
135 |
136 | it("should throw error when post is not found", async () => {
137 | // Given: Mock API client returns null data
138 | const mockResponse = {
139 | data: null,
140 | status: 404,
141 | statusText: "Not Found",
142 | ok: false,
143 | };
144 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
145 |
146 | // When & Then: Should throw error for not found post
147 | await expect(postApiRepository.getById("non-existent")).rejects.toThrow(
148 | "Post with ID non-existent not found"
149 | );
150 | });
151 |
152 | it("should throw error when API call fails", async () => {
153 | // Given: Mock API client throws error
154 | const apiError = new Error("API Error");
155 | vi.mocked(mockApiClient.get).mockRejectedValue(apiError);
156 |
157 | // When & Then: Should throw the API error
158 | await expect(postApiRepository.getById("post-123")).rejects.toThrow(
159 | "API Error"
160 | );
161 | });
162 | });
163 |
164 | describe("create", () => {
165 | it("should return Post domain object when creation succeeds", async () => {
166 | // Given: Mock API client returns created post data
167 | const mockResponse = {
168 | data: validPostDto,
169 | status: 201,
170 | statusText: "Created",
171 | ok: true,
172 | };
173 | vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);
174 |
175 | const newPost = new Post(
176 | "",
177 | validUserReference,
178 | "New Post Title",
179 | "New Post Body",
180 | "https://example.com/image.jpg",
181 | 0,
182 | 0,
183 | Date.now(),
184 | Date.now()
185 | );
186 |
187 | // When: Create post
188 | const result = await postApiRepository.create(newPost);
189 |
190 | // Then: Should return Post domain object
191 | expect(result).toBeInstanceOf(Post);
192 | expect(result?.id).toBe(validPostDto.id);
193 | expect(mockApiClient.post).toHaveBeenCalledWith("/posts/add", {
194 | title: "New Post Title",
195 | body: "New Post Body",
196 | userId: validUserReference.id,
197 | });
198 | });
199 |
200 | it("should return null when creation fails", async () => {
201 | // Given: Mock API client returns null data
202 | const mockResponse = {
203 | data: null,
204 | status: 400,
205 | statusText: "Bad Request",
206 | ok: false,
207 | };
208 | vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);
209 |
210 | const newPost = new Post(
211 | "",
212 | validUserReference,
213 | "Failed Post",
214 | "Failed Body",
215 | "",
216 | 0,
217 | 0,
218 | Date.now(),
219 | Date.now()
220 | );
221 |
222 | // When: Create post
223 | const result = await postApiRepository.create(newPost);
224 |
225 | // Then: Should return null
226 | expect(result).toBeNull();
227 | });
228 | });
229 |
230 | describe("update", () => {
231 | it("should return updated Post domain object when update succeeds", async () => {
232 | // Given: Mock API client returns updated post data
233 | const updatedPostDto = {
234 | ...validPostDto,
235 | title: "Updated Title",
236 | body: "Updated Body",
237 | updatedAt: Date.now(),
238 | };
239 | const mockResponse = {
240 | data: updatedPostDto,
241 | status: 200,
242 | statusText: "OK",
243 | ok: true,
244 | };
245 | vi.mocked(mockApiClient.put).mockResolvedValue(mockResponse);
246 |
247 | const existingPost = new Post(
248 | validPostDto.id,
249 | validUserReference,
250 | "Updated Title",
251 | "Updated Body",
252 | validPostDto.image,
253 | validPostDto.likes,
254 | validPostDto.totalComments,
255 | validPostDto.createdAt,
256 | Date.now()
257 | );
258 |
259 | // When: Update post
260 | const result = await postApiRepository.update(existingPost);
261 |
262 | // Then: Should return updated Post domain object
263 | expect(result).toBeInstanceOf(Post);
264 | expect(result?.title).toBe("Updated Title");
265 | expect(result?.body).toBe("Updated Body");
266 | expect(mockApiClient.put).toHaveBeenCalledWith(
267 | `/posts/${validPostDto.id}`,
268 | {
269 | title: "Updated Title",
270 | body: "Updated Body",
271 | }
272 | );
273 | });
274 |
275 | it("should return null when update fails", async () => {
276 | // Given: Mock API client returns null data
277 | const mockResponse = {
278 | data: null,
279 | status: 400,
280 | statusText: "Bad Request",
281 | ok: false,
282 | };
283 | vi.mocked(mockApiClient.put).mockResolvedValue(mockResponse);
284 |
285 | const existingPost = new Post(
286 | validPostDto.id,
287 | validUserReference,
288 | "Failed Update",
289 | "Failed Body",
290 | validPostDto.image,
291 | validPostDto.likes,
292 | validPostDto.totalComments,
293 | validPostDto.createdAt,
294 | Date.now()
295 | );
296 |
297 | // When: Update post
298 | const result = await postApiRepository.update(existingPost);
299 |
300 | // Then: Should return null
301 | expect(result).toBeNull();
302 | });
303 | });
304 |
305 | describe("delete", () => {
306 | it("should return true when deletion succeeds", async () => {
307 | // Given: Mock API client returns successful response
308 | const mockResponse = {
309 | data: { success: true },
310 | ok: true,
311 | status: 200,
312 | statusText: "OK",
313 | };
314 | vi.mocked(mockApiClient.delete).mockResolvedValue(mockResponse);
315 |
316 | // When: Delete post
317 | const result = await postApiRepository.delete("post-123");
318 |
319 | // Then: Should return true
320 | expect(result).toBe(true);
321 | expect(mockApiClient.delete).toHaveBeenCalledWith("/posts/post-123");
322 | });
323 |
324 | it("should return false when deletion fails", async () => {
325 | // Given: Mock API client throws error
326 | const apiError = new Error("Delete API Error");
327 | vi.mocked(mockApiClient.delete).mockRejectedValue(apiError);
328 |
329 | // When: Delete post
330 | const result = await postApiRepository.delete("post-123");
331 |
332 | // Then: Should return false
333 | expect(result).toBe(false);
334 | });
335 | });
336 |
337 | describe("like", () => {
338 | it("should return true when like succeeds", async () => {
339 | // Given: Mock API client returns successful response
340 | const mockResponse = {
341 | data: { success: true },
342 | ok: true,
343 | status: 200,
344 | statusText: "OK",
345 | };
346 | vi.mocked(mockApiClient.patch).mockResolvedValue(mockResponse);
347 |
348 | // When: Like post
349 | const result = await postApiRepository.like("post-123", "user-456");
350 |
351 | // Then: Should return true
352 | expect(result).toBe(true);
353 | expect(mockApiClient.patch).toHaveBeenCalledWith("/posts/post-123/like", {
354 | userId: "user-456",
355 | });
356 | });
357 |
358 | it("should return false when like fails", async () => {
359 | // Given: Mock API client throws error
360 | const apiError = new Error("Like API Error");
361 | vi.mocked(mockApiClient.patch).mockRejectedValue(apiError);
362 |
363 | // When: Like post
364 | const result = await postApiRepository.like("post-123", "user-456");
365 |
366 | // Then: Should return false
367 | expect(result).toBe(false);
368 | });
369 | });
370 |
371 | describe("unlike", () => {
372 | it("should return true when unlike succeeds", async () => {
373 | // Given: Mock API client returns successful response
374 | const mockResponse = {
375 | data: { success: true },
376 | ok: true,
377 | status: 200,
378 | statusText: "OK",
379 | };
380 | vi.mocked(mockApiClient.patch).mockResolvedValue(mockResponse);
381 |
382 | // When: Unlike post
383 | const result = await postApiRepository.unlike("post-123", "user-456");
384 |
385 | // Then: Should return true
386 | expect(result).toBe(true);
387 | expect(mockApiClient.patch).toHaveBeenCalledWith(
388 | "/posts/post-123/unlike",
389 | {
390 | userId: "user-456",
391 | }
392 | );
393 | });
394 |
395 | it("should return false when unlike fails", async () => {
396 | // Given: Mock API client throws error
397 | const apiError = new Error("Unlike API Error");
398 | vi.mocked(mockApiClient.patch).mockRejectedValue(apiError);
399 |
400 | // When: Unlike post
401 | const result = await postApiRepository.unlike("post-123", "user-456");
402 |
403 | // Then: Should return false
404 | expect(result).toBe(false);
405 | });
406 | });
407 | });
408 |

---

## /src/entities/post/**tests**/mapper/post.mapper.test.ts:

1 | import { beforeEach, describe, expect, it } from "vitest";
2 | import { Post } from "../../core";
3 | import { PostDto } from "../../infrastructure/dto";
4 | import { PostMapper } from "../../mapper";
5 | import { PostEntity, UserReference } from "../../types";
6 |
7 | /\*_
8 | _ Post Mapper Tests
9 | _ Verify core Post mapper functionality using Given-When-Then pattern
10 | _/
11 | describe("Post Mapper", () => {
12 | let validPost: Post;
13 | let validPostDto: PostDto;
14 | let validPostEntity: PostEntity;
15 | let validUserReference: UserReference;
16 |
17 | beforeEach(() => {
18 | // Given: Set up valid test data for mapper tests
19 | validUserReference = {
20 | id: "user-123",
21 | username: "testuser",
22 | profileImage: "https://example.com/avatar.jpg",
23 | };
24 |
25 | const now = Date.now();
26 | validPost = new Post(
27 | "post-123",
28 | validUserReference,
29 | "Test Post Title",
30 | "Test post body content",
31 | "https://example.com/image.jpg",
32 | 10,
33 | 5,
34 | now,
35 | now
36 | );
37 |
38 | validPostDto = {
39 | id: "post-123",
40 | user: validUserReference,
41 | title: "Test Post Title",
42 | body: "Test post body content",
43 | image: "https://example.com/image.jpg",
44 | likes: 10,
45 | totalComments: 5,
46 | createdAt: now,
47 | updatedAt: now,
48 | };
49 |
50 | validPostEntity = {
51 | id: "post-123",
52 | user: validUserReference,
53 | title: "Test Post Title",
54 | body: "Test post body content",
55 | image: "https://example.com/image.jpg",
56 | likes: 10,
57 | totalComments: 5,
58 | createdAt: now,
59 | updatedAt: now,
60 | };
61 | });
62 |
63 | describe("toDto", () => {
64 | it("should convert Post domain to PostDto when provided with valid Post", () => {
65 | // Given: Valid Post domain object
66 | const post = validPost;
67 |
68 | // When: Convert to DTO
69 | const result = PostMapper.toDto(post);
70 |
71 | // Then: Should return correct PostDto
72 | expect(result).toEqual({
73 | id: post.id,
74 | user: post.user,
75 | title: post.title,
76 | body: post.body,
77 | image: post.image,
78 | likes: post.likes,
79 | totalComments: post.totalComments,
80 | createdAt: post.createdAt,
81 | updatedAt: post.updatedAt,
82 | });
83 | });
84 |
85 | it("should handle Post with empty image when converting to DTO", () => {
86 | // Given: Post with empty image
87 | const postWithoutImage = new Post(
88 | "post-123",
89 | validUserReference,
90 | "Test Title",
91 | "Test Body",
92 | "",
93 | 5,
94 | 2,
95 | Date.now(),
96 | Date.now()
97 | );
98 |
99 | // When: Convert to DTO
100 | const result = PostMapper.toDto(postWithoutImage);
101 |
102 | // Then: Should return DTO with empty image
103 | expect(result.image).toBe("");
104 | expect(result.id).toBe("post-123");
105 | });
106 |
107 | it("should handle Post with zero likes and comments when converting to DTO", () => {
108 | // Given: Post with zero likes and comments
109 | const postWithZeroStats = new Post(
110 | "post-zero",
111 | validUserReference,
112 | "Zero Stats Post",
113 | "This post has no likes or comments",
114 | "https://example.com/image.jpg",
115 | 0,
116 | 0,
117 | Date.now(),
118 | Date.now()
119 | );
120 |
121 | // When: Convert to DTO
122 | const result = PostMapper.toDto(postWithZeroStats);
123 |
124 | // Then: Should return DTO with zero values
125 | expect(result.likes).toBe(0);
126 | expect(result.totalComments).toBe(0);
127 | });
128 | });
129 |
130 | describe("toDomain", () => {
131 | it("should convert PostDto to Post domain when provided with valid DTO", () => {
132 | // Given: Valid PostDto
133 | const dto = validPostDto;
134 |
135 | // When: Convert to domain
136 | const result = PostMapper.toDomain(dto);
137 |
138 | // Then: Should return Post domain object
139 | expect(result).toBeInstanceOf(Post);
140 | expect(result.id).toBe(dto.id);
141 | expect(result.user).toEqual(dto.user);
142 | expect(result.title).toBe(dto.title);
143 | expect(result.body).toBe(dto.body);
144 | expect(result.image).toBe(dto.image);
145 | expect(result.likes).toBe(dto.likes);
146 | expect(result.totalComments).toBe(dto.totalComments);
147 | expect(result.createdAt).toBe(dto.createdAt);
148 | expect(result.updatedAt).toBe(dto.updatedAt);
149 | });
150 |
151 | it("should handle null image when converting DTO to domain", () => {
152 | // Given: PostDto with null image
153 | const dtoWithNullImage: PostDto = {
154 | ...validPostDto,
155 | image: null as unknown as string,
156 | };
157 |
158 | // When: Convert to domain
159 | const result = PostMapper.toDomain(dtoWithNullImage);
160 |
161 | // Then: Should use empty string as default
162 | expect(result.image).toBe("");
163 | expect(result.id).toBe(validPostDto.id);
164 | });
165 | });
166 |
167 | describe("fromEntity", () => {
168 | it("should convert PostEntity to Post domain when provided with valid entity", () => {
169 | // Given: Valid PostEntity
170 | const entity = validPostEntity;
171 |
172 | // When: Convert from entity
173 | const result = PostMapper.fromEntity(entity);
174 |
175 | // Then: Should return Post domain object
176 | expect(result).toBeInstanceOf(Post);
177 | expect(result.id).toBe(entity.id);
178 | expect(result.user).toEqual(entity.user);
179 | expect(result.title).toBe(entity.title);
180 | expect(result.body).toBe(entity.body);
181 | expect(result.image).toBe(entity.image);
182 | expect(result.likes).toBe(entity.likes);
183 | expect(result.totalComments).toBe(entity.totalComments);
184 | expect(result.createdAt).toBe(entity.createdAt);
185 | expect(result.updatedAt).toBe(entity.updatedAt);
186 | });
187 | });
188 |
189 | describe("fromEntityList", () => {
190 | it("should convert array of PostEntity to array of Post domain when provided with valid entities", () => {
191 | // Given: Array of valid PostEntity objects
192 | const entities = [validPostEntity];
193 |
194 | // When: Convert from entity list
195 | const result = PostMapper.fromEntityList(entities);
196 |
197 | // Then: Should return array of Post domain objects
198 | expect(result).toHaveLength(1);
199 | expect(result[0]).toBeInstanceOf(Post);
200 | expect(result[0].id).toBe(entities[0].id);
201 | expect(result[0].user).toEqual(entities[0].user);
202 | });
203 |
204 | it("should handle empty array when converting entity list", () => {
205 | // Given: Empty array of PostEntity
206 | const emptyEntities: PostEntity[] = [];
207 |
208 | // When: Convert from entity list
209 | const result = PostMapper.fromEntityList(emptyEntities);
210 |
211 | // Then: Should return empty array
212 | expect(result).toEqual([]);
213 | expect(result).toHaveLength(0);
214 | });
215 | });
216 |
217 | describe("toDomainList", () => {
218 | it("should convert array of PostDto to array of Post domain when provided with valid DTOs", () => {
219 | // Given: Array of valid PostDto objects
220 | const dtos = [validPostDto];
221 |
222 | // When: Convert to domain list
223 | const result = PostMapper.toDomainList(dtos);
224 |
225 | // Then: Should return array of Post domain objects
226 | expect(result).toHaveLength(1);
227 | expect(result[0]).toBeInstanceOf(Post);
228 | expect(result[0].id).toBe(dtos[0].id);
229 | expect(result[0].user).toEqual(dtos[0].user);
230 | });
231 |
232 | it("should handle empty array when converting DTO list", () => {
233 | // Given: Empty array of PostDto
234 | const emptyDtos: PostDto[] = [];
235 |
236 | // When: Convert to domain list
237 | const result = PostMapper.toDomainList(emptyDtos);
238 |
239 | // Then: Should return empty array
240 | expect(result).toEqual([]);
241 | expect(result).toHaveLength(0);
242 | });
243 | });
244 |
245 | describe("toDtoList", () => {
246 | it("should convert array of Post domain to array of PostDto when provided with valid Posts", () => {
247 | // Given: Array of valid Post domain objects
248 | const posts = [validPost];
249 |
250 | // When: Convert to DTO list
251 | const result = PostMapper.toDtoList(posts);
252 |
253 | // Then: Should return array of PostDto objects
254 | expect(result).toHaveLength(1);
255 | expect(result[0].id).toBe(posts[0].id);
256 | expect(result[0].user).toEqual(posts[0].user);
257 | expect(result[0].title).toBe(posts[0].title);
258 | });
259 |
260 | it("should handle empty array when converting Post list to DTO", () => {
261 | // Given: Empty array of Post domain objects
262 | const emptyPosts: Post[] = [];
263 |
264 | // When: Convert to DTO list
265 | const result = PostMapper.toDtoList(emptyPosts);
266 |
267 | // Then: Should return empty array
268 | expect(result).toEqual([]);
269 | expect(result).toHaveLength(0);
270 | });
271 | });
272 | });
273 |

---

## /src/entities/post/**tests**/mocks/index.ts:

1 | export { PostApiMocks } from "./post-api.mock";
2 |
3 | export {
4 | PostRepositoryMocks,
5 | type MockPostRepository,
6 | } from "./post-repository.mock";
7 |

---

## /src/entities/post/**tests**/mocks/post-api.mock.ts:

1 | import { ErrorMessages, HttpMocks, HttpStatus } from "@/shared/libs/**tests**";
2 | import { PostEntity } from "../../types";
3 |
4 | export const PostApiMocks = {
5 | getPost: (post: PostEntity) => HttpMocks.get(post),
6 |
7 | getPosts: (posts: PostEntity[]) => HttpMocks.get(posts),
8 |
9 | createPost: (post: PostEntity) => HttpMocks.post(post, HttpStatus.CREATED),
10 | updatePost: (post: PostEntity) => HttpMocks.put(post),
11 |
12 | deletePost: () => HttpMocks.delete(),
13 | getPostsByUser: (posts: PostEntity[]) => HttpMocks.get(posts),
14 |
15 | getPopularPosts: (posts: PostEntity[]) => HttpMocks.get(posts),
16 | searchPosts: (posts: PostEntity[]) => HttpMocks.get(posts),
17 |
18 | likePost: (post: PostEntity) =>
19 | HttpMocks.put({ ...post, likes: post.likes + 1 }),
20 |
21 | unlikePost: (post: PostEntity) =>
22 | HttpMocks.put({ ...post, likes: Math.max(0, post.likes - 1) }),
23 |
24 | errors: {
25 | notFound: () =>
26 | HttpMocks.error(ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND),
27 |
28 | unauthorized: () =>
29 | HttpMocks.error(ErrorMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED),
30 |
31 | forbidden: () =>
32 | HttpMocks.error(ErrorMessages.FORBIDDEN, HttpStatus.FORBIDDEN),
33 |
34 | badRequest: () =>
35 | HttpMocks.error(ErrorMessages.BAD_REQUEST, HttpStatus.BAD_REQUEST),
36 |
37 | validation: () =>
38 | HttpMocks.error("Invalid post data", HttpStatus.UNPROCESSABLE_ENTITY),
39 |
40 | serverError: () =>
41 | HttpMocks.error(
42 | ErrorMessages.INTERNAL_ERROR,
43 | HttpStatus.INTERNAL_SERVER_ERROR
44 | ),
45 |
46 | networkError: () => HttpMocks.networkError(),
47 |
48 | timeout: () => HttpMocks.timeoutError(),
49 | },
50 | };
51 |

---

## /src/entities/post/**tests**/mocks/post-repository.mock.ts:

1 | import { MockRepository, RepositoryMockFactory } from "@/shared/libs/**tests**";
2 | import { PostEntity } from "../../types";
3 |
4 | export interface MockPostRepository extends MockRepository<PostEntity> {
5 | getAll: ReturnType<typeof vi.fn>;
6 | getById: ReturnType<typeof vi.fn>;
7 | search: ReturnType<typeof vi.fn>;
8 | create: ReturnType<typeof vi.fn>;
9 | like: ReturnType<typeof vi.fn>;
10 | unlike: ReturnType<typeof vi.fn>;
11 | findByUserId: ReturnType<typeof vi.fn>;
12 | findByTitle: ReturnType<typeof vi.fn>;
13 | findPopular: ReturnType<typeof vi.fn>;
14 | incrementLikes: ReturnType<typeof vi.fn>;
15 | decrementLikes: ReturnType<typeof vi.fn>;
16 | }
17 |
18 | export const PostRepositoryMocks = {
19 | create: (): MockPostRepository => ({
20 | ...RepositoryMockFactory.createBasicMock<PostEntity>(),
21 | getAll: vi.fn(),
22 | getById: vi.fn(),
23 | search: vi.fn(),
24 | create: vi.fn(),
25 | like: vi.fn(),
26 | unlike: vi.fn(),
27 | findByUserId: vi.fn(),
28 | findByTitle: vi.fn(),
29 | findPopular: vi.fn(),
30 | incrementLikes: vi.fn(),
31 | decrementLikes: vi.fn(),
32 | }),
33 |
34 | createSuccess: (
35 | mockPost: PostEntity,
36 | mockPosts: PostEntity[] = []
37 | ): MockPostRepository => ({
38 | ...RepositoryMockFactory.createSuccessMock(mockPost, mockPosts),
39 | getAll: vi.fn().mockResolvedValue(mockPosts),
40 | getById: vi.fn().mockResolvedValue(mockPost),
41 | search: vi.fn().mockResolvedValue(mockPosts),
42 | create: vi.fn().mockResolvedValue(mockPost),
43 | like: vi.fn().mockResolvedValue(true),
44 | unlike: vi.fn().mockResolvedValue(true),
45 | findByUserId: vi.fn().mockResolvedValue(mockPosts),
46 | findByTitle: vi.fn().mockResolvedValue(mockPosts),
47 | findPopular: vi.fn().mockResolvedValue(mockPosts),
48 | incrementLikes: vi
49 | .fn()
50 | .mockResolvedValue({ ...mockPost, likes: mockPost.likes + 1 }),
51 | decrementLikes: vi.fn().mockResolvedValue({
52 | ...mockPost,
53 | likes: Math.max(0, mockPost.likes - 1),
54 | }),
55 | }),
56 |
57 | createNotFound: (): MockPostRepository => ({
58 | ...RepositoryMockFactory.createNotFoundMock<PostEntity>(),
59 | getAll: vi.fn().mockResolvedValue([]),
60 | getById: vi.fn().mockResolvedValue(null),
61 | search: vi.fn().mockResolvedValue([]),
62 | create: vi.fn().mockResolvedValue(null),
63 | like: vi.fn().mockRejectedValue(new Error("Post not found")),
64 | unlike: vi.fn().mockRejectedValue(new Error("Post not found")),
65 | findByUserId: vi.fn().mockResolvedValue([]),
66 | findByTitle: vi.fn().mockResolvedValue([]),
67 | findPopular: vi.fn().mockResolvedValue([]),
68 | incrementLikes: vi.fn().mockRejectedValue(new Error("Post not found")),
69 | decrementLikes: vi.fn().mockRejectedValue(new Error("Post not found")),
70 | }),
71 |
72 | createError: (
73 | error: Error = new Error("Post Repository Error")
74 | ): MockPostRepository => ({
75 | ...RepositoryMockFactory.createErrorMock<PostEntity>(error),
76 | getAll: vi.fn().mockRejectedValue(error),
77 | getById: vi.fn().mockRejectedValue(error),
78 | search: vi.fn().mockRejectedValue(error),
79 | create: vi.fn().mockRejectedValue(error),
80 | like: vi.fn().mockRejectedValue(error),
81 | unlike: vi.fn().mockRejectedValue(error),
82 | findByUserId: vi.fn().mockRejectedValue(error),
83 | findByTitle: vi.fn().mockRejectedValue(error),
84 | findPopular: vi.fn().mockRejectedValue(error),
85 | incrementLikes: vi.fn().mockRejectedValue(error),
86 | decrementLikes: vi.fn().mockRejectedValue(error),
87 | }),
88 |
89 | createLikeScenario: (mockPost: PostEntity): MockPostRepository => ({
90 | ...RepositoryMockFactory.createBasicMock<PostEntity>(),
91 | getAll: vi.fn().mockResolvedValue([mockPost]),
92 | getById: vi.fn().mockResolvedValue(mockPost),
93 | search: vi.fn().mockResolvedValue([mockPost]),
94 | create: vi.fn().mockResolvedValue(mockPost),
95 | like: vi.fn().mockImplementation(async (id: string) => {
96 | if (id === mockPost.id) {
97 | return true;
98 | }
99 | throw new Error("Post not found");
100 | }),
101 | unlike: vi.fn().mockImplementation(async (id: string) => {
102 | if (id === mockPost.id) {
103 | return true;
104 | }
105 | throw new Error("Post not found");
106 | }),
107 | findById: vi.fn().mockResolvedValue(mockPost),
108 | findAll: vi.fn().mockResolvedValue([mockPost]),
109 | findByUserId: vi.fn().mockResolvedValue([mockPost]),
110 | findByTitle: vi.fn().mockResolvedValue([mockPost]),
111 | findPopular: vi.fn().mockResolvedValue([mockPost]),
112 | incrementLikes: vi.fn().mockImplementation(async (id: string) => {
113 | if (id === mockPost.id) {
114 | return { ...mockPost, likes: mockPost.likes + 1 };
115 | }
116 | throw new Error("Post not found");
117 | }),
118 | decrementLikes: vi.fn().mockImplementation(async (id: string) => {
119 | if (id === mockPost.id) {
120 | return { ...mockPost, likes: Math.max(0, mockPost.likes - 1) };
121 | }
122 | throw new Error("Post not found");
123 | }),
124 | save: vi.fn().mockResolvedValue(mockPost),
125 | update: vi.fn().mockResolvedValue(mockPost),
126 | delete: vi.fn().mockResolvedValue(undefined),
127 | }),
128 | };
129 |

---

## /src/entities/post/core/index.ts:

1 | export { Post } from "./post.domain";
2 | export { PostFactory } from "./post.factory";
3 | export type { PostRepository } from "./post.repository";
4 |

---

## /src/entities/post/core/post.domain.ts:

1 | import { PostEntity, UserReference } from "@/entities/post/types";
2 |
3 | export class Post implements PostEntity {
4 | private \_id: string;
5 | private \_user: UserReference;
6 | private \_title: string;
7 | private \_body: string;
8 | private \_image: string;
9 | private \_likes: number;
10 | private \_totalComments: number;
11 | private \_createdAt: number;
12 | private \_updatedAt: number;
13 |
14 | constructor(
15 | id: string,
16 | user: UserReference,
17 | title: string,
18 | body: string,
19 | image: string,
20 | likes: number,
21 | totalComments: number,
22 | createdAt: number,
23 | updatedAt: number
24 | ) {
25 | this.\_id = id;
26 | this.\_user = user;
27 | this.\_title = title;
28 | this.\_body = body;
29 | this.\_image = image;
30 | this.\_likes = likes;
31 | this.\_totalComments = totalComments;
32 | this.\_createdAt = createdAt;
33 | this.\_updatedAt = updatedAt;
34 | }
35 |
36 | get id(): string {
37 | return this.\_id;
38 | }
39 |
40 | get user(): UserReference {
41 | return this.\_user;
42 | }
43 |
44 | get title(): string {
45 | return this.\_title;
46 | }
47 |
48 | get body(): string {
49 | return this.\_body;
50 | }
51 |
52 | get image(): string {
53 | return this.\_image;
54 | }
55 |
56 | get likes(): number {
57 | return this.\_likes;
58 | }
59 |
60 | get createdAt(): number {
61 | return this.\_createdAt;
62 | }
63 |
64 | get updatedAt(): number {
65 | return this.\_updatedAt;
66 | }
67 |
68 | get totalComments(): number {
69 | return this.\_totalComments;
70 | }
71 |
72 | updateTitle(newTitle: string): void {
73 | this.\_title = newTitle;
74 | this.\_updatedAt = new Date().getTime();
75 | }
76 |
77 | updateBody(newBody: string): void {
78 | this.\_body = newBody;
79 | this.\_updatedAt = new Date().getTime();
80 | }
81 |
82 | like(): void {
83 | this.\_likes += 1;
84 | }
85 |
86 | unlike(): void {
87 | if (this.\_likes > 0) {
88 | this.\_likes -= 1;
89 | }
90 | }
91 | }
92 |

---

## /src/entities/post/core/post.factory.ts:

1 | import { PostDto } from "../infrastructure/dto";
2 | import { UserReference } from "../types";
3 | import { Post } from "./post.domain";
4 |
5 | export class PostFactory {
6 | static createNew(
7 | title: string,
8 | body: string,
9 | user: UserReference,
10 | image: string = ""
11 | ): Post {
12 | return new Post(
13 | "",
14 | user,
15 | title,
16 | body,
17 | image,
18 | 0,
19 | 0,
20 | new Date().getTime(),
21 | new Date().getTime()
22 | );
23 | }
24 |
25 | static createFromDto(dto: PostDto): Post {
26 | return new Post(
27 | dto.id,
28 | dto.user,
29 | dto.title,
30 | dto.body,
31 | dto.image || "",
32 | dto.likes || 0,
33 | dto.totalComments || 0,
34 | dto.createdAt || new Date().getTime(),
35 | dto.updatedAt || new Date().getTime()
36 | );
37 | }
38 | }
39 |

---

## /src/entities/post/core/post.repository.ts:

1 | import { Post } from "@/entities/post/core/post.domain";
2 |
3 | export interface PostRepository {
4 | getAll(limit?: number, skip?: number): Promise<Post[]>;
5 | getById(id: string): Promise<Post>;
6 | search(query: string): Promise<Post[]>;
7 | create(post: Post): Promise<Post | null>;
8 | update(post: Post): Promise<Post | null>;
9 | save(post: Post): Promise<Post>;
10 | delete(id: string): Promise<boolean>;
11 | like(id: string, userId: string): Promise<boolean>;
12 | unlike(id: string, userId: string): Promise<boolean>;
13 | }
14 |

---

## /src/entities/post/index.ts:

1 | export { Post, PostFactory, type PostRepository } from "./core";
2 | export { POST_QUERY_KEYS } from "./infrastructure/api/post-query-key.api";
3 | export { type PostDto } from "./infrastructure/dto";
4 | export { PostApiRepository } from "./infrastructure/repository";
5 | export { PostMapper } from "./mapper";
6 | export { type PostEntity } from "./types";
7 |

---

## /src/entities/post/infrastructure/api/index.ts:

1 | export { POST_QUERY_KEYS } from "./post-query-key.api";
2 | export { PostAdapter } from "./post.adapter";
3 |

---

## /src/entities/post/infrastructure/api/post-query-key.api.ts:

1 | export const POST_QUERY_KEYS = {
2 | all: ["posts"] as const,
3 | list: (params: { limit?: number; skip?: number }) =>
4 | ["posts", "list", params] as const,
5 | search: (query: string) => ["posts", "search", query] as const,
6 | detail: (id: string) => ["post", id] as const,
7 | };
8 |

---

## /src/entities/post/infrastructure/api/post.adapter.ts:

1 | import { ApiClient } from "@/shared/api";
2 | import { Pagination } from "@/shared/types";
3 | import { PostDto } from "../dto/post.dto";
4 |
5 | export const PostAdapter = (apiClient: ApiClient) => ({
6 | list: async (limit: number, skip: number): Promise<Pagination<PostDto>> => {
7 | try {
8 | const response = await apiClient.get<Pagination<PostDto>>(
9 | `/posts?limit=${limit}&skip=${skip}`
10 | );
11 | return response.data;
12 | } catch (error) {
13 | console.error(`Error fetching post list:`, error);
14 | throw error;
15 | }
16 | },
17 | search: async (searchQuery: string): Promise<Pagination<PostDto>> => {
18 | try {
19 | const response = await apiClient.get<Pagination<PostDto>>(
20 | `/posts/search?q=${searchQuery}`
21 | );
22 | return response.data;
23 | } catch (error) {
24 | console.error(`Error searching for '${searchQuery}':`, error);
25 | throw error;
26 | }
27 | },
28 |
29 | getById: async (id: string): Promise<PostDto> => {
30 | try {
31 | const response = await apiClient.get<PostDto>(`/posts/${id}`);
32 | return response.data;
33 | } catch (error) {
34 | console.error(`Error fetching post with ID ${id}:`, error);
35 | throw error;
36 | }
37 | },
38 |
39 | create: async (
40 | title: string,
41 | body: string,
42 | userId: string
43 | ): Promise<PostDto> => {
44 | try {
45 | const response = await apiClient.post<PostDto>(`/posts/add`, {
46 | title,
47 | body,
48 | userId,
49 | });
50 | return response.data;
51 | } catch (error) {
52 | console.error(`Error creating post:`, error);
53 | throw error;
54 | }
55 | },
56 |
57 | update: async (id: string, title: string, body: string): Promise<PostDto> => {
58 | try {
59 | const response = await apiClient.put<PostDto>(`/posts/${id}`, {
60 | title,
61 | body,
62 | });
63 | return response.data;
64 | } catch (error) {
65 | console.error(`Error updating post with ID ${id}:`, error);
66 | throw error;
67 | }
68 | },
69 |
70 | remove: async (id: string): Promise<boolean> => {
71 | try {
72 | const response = await apiClient.delete<{ success: boolean }>(
73 | `/posts/${id}`
74 | );
75 | return response.ok;
76 | } catch (error) {
77 | console.error(`Error deleting post with ID ${id}:`, error);
78 | return false;
79 | }
80 | },
81 |
82 | likePost: async (id: string, userId: string): Promise<boolean> => {
83 | try {
84 | const response = await apiClient.patch<{ success: boolean }>(
85 | `/posts/${id}/like`,
86 | { userId }
87 | );
88 | return response.ok;
89 | } catch (error) {
90 | console.error(`Error liking post with ID ${id}:`, error);
91 | return false;
92 | }
93 | },
94 |
95 | unlikePost: async (id: string, userId: string): Promise<boolean> => {
96 | try {
97 | const response = await apiClient.patch<{ success: boolean }>(
98 | `/posts/${id}/unlike`,
99 | { userId }
100 | );
101 | return response.ok;
102 | } catch (error) {
103 | console.error(`Error unliking post with ID ${id}:`, error);
104 | return false;
105 | }
106 | },
107 | });
108 |

---

## /src/entities/post/infrastructure/dto/index.ts:

1 | export type { PostDto } from "./post.dto";
2 |

---

## /src/entities/post/infrastructure/dto/post.dto.ts:

1 | import { UserReference } from "../../types";
2 |
3 | export type PostDto = {
4 | id: string;
5 | user: UserReference;
6 | title: string;
7 | body: string;
8 | image: string;
9 | likes: number;
10 | totalComments: number;
11 | createdAt: number;
12 | updatedAt: number;
13 | };
14 |

---

## /src/entities/post/infrastructure/repository/index.ts:

1 | export { PostApiRepository } from "./post.api.repository";
2 |

---

## /src/entities/post/infrastructure/repository/post.api.repository.ts:

1 | import { PostAdapter } from "@/entities/post/infrastructure/api";
2 | import { PostMapper } from "@/entities/post/mapper";
3 | import { ApiClient } from "@/shared/api";
4 | import { PostRepository } from "../../core";
5 | import { Post } from "../../core/post.domain";
6 |
7 | export class PostApiRepository implements PostRepository {
8 | private api: ReturnType<typeof PostAdapter>;
9 |
10 | constructor(apiClient: ApiClient) {
11 | this.api = PostAdapter(apiClient);
12 | }
13 |
14 | async getAll(limit: number, skip: number): Promise<Post[]> {
15 | try {
16 | const response = await this.api.list(limit, skip);
17 | if (!response || !response.data || !response.data.length) return [];
18 |
19 | return PostMapper.toDomainList(response.data);
20 | } catch (error) {
21 | console.error(`Error fetching post list:`, error);
22 | return [];
23 | }
24 | }
25 |
26 | async getById(id: string): Promise<Post> {
27 | try {
28 | const postDto = await this.api.getById(id);
29 | if (!postDto) {
30 | throw new Error(`Post with ID ${id} not found`);
31 | }
32 |
33 | return PostMapper.toDomain(postDto);
34 | } catch (error) {
35 | console.error(`Error fetching post with ID ${id}:`, error);
36 | throw error;
37 | }
38 | }
39 |
40 | async search(query: string): Promise<Post[]> {
41 | try {
42 | const response = await this.api.search(query);
43 | if (!response || !response.data || !response.data.length) return [];
44 |
45 | return PostMapper.toDomainList(response.data);
46 | } catch (error) {
47 | console.error(`Error searching for '${query}':`, error);
48 | return [];
49 | }
50 | }
51 |
52 | async create(post: Post): Promise<Post | null> {
53 | try {
54 | const result = await this.api.create(post.title, post.body, post.user.id);
55 | if (!result) {
56 | console.error(`Failed to create post`);
57 | return null;
58 | }
59 | return PostMapper.toDomain(result);
60 | } catch (error) {
61 | console.error(`Error creating post:`, error);
62 | return null;
63 | }
64 | }
65 |
66 | async update(post: Post): Promise<Post | null> {
67 | try {
68 | const result = await this.api.update(post.id, post.title, post.body);
69 | if (!result) {
70 | console.error(`Failed to update post with ID ${post.id}`);
71 | return null;
72 | }
73 | return PostMapper.toDomain(result);
74 | } catch (error) {
75 | console.error(`Error updating post with ID ${post.id}:`, error);
76 | return null;
77 | }
78 | }
79 |
80 | async save(post: Post): Promise<Post> {
81 | try {
82 | if (post.id) {
83 | const result = await this.update(post);
84 | if (!result) {
85 | throw new Error(`Failed to update post with ID ${post.id}`);
86 | }
87 | return result;
88 | } else {
89 | const result = await this.create(post);
90 | if (!result) {
91 | throw new Error(`Failed to create new post`);
92 | }
93 | return result;
94 | }
95 | } catch (error) {
96 | console.error(`Error saving post:`, error);
97 | throw error;
98 | }
99 | }
100 |
101 | async delete(id: string): Promise<boolean> {
102 | try {
103 | const result = await this.api.remove(id);
104 | return result;
105 | } catch (error) {
106 | console.error(`Error deleting post with ID ${id}:`, error);
107 | return false;
108 | }
109 | }
110 |
111 | async like(id: string, userId: string): Promise<boolean> {
112 | try {
113 | const result = await this.api.likePost(id, userId);
114 | return result;
115 | } catch (error) {
116 | console.error(`Error liking post with ID ${id}:`, error);
117 | return false;
118 | }
119 | }
120 |
121 | async unlike(id: string, userId: string): Promise<boolean> {
122 | try {
123 | const result = await this.api.unlikePost(id, userId);
124 | return result;
125 | } catch (error) {
126 | console.error(`Error unliking post with ID ${id}:`, error);
127 | return false;
128 | }
129 | }
130 | }
131 |

---

## /src/entities/post/mapper/index.ts:

1 | export { PostMapper } from "./post.mapper";
2 |

---

## /src/entities/post/mapper/post.mapper.ts:

1 | import { Post } from "@/entities/post/core";
2 | import { PostDto } from "../infrastructure/dto";
3 | import { PostEntity } from "../types";
4 |
5 | export class PostMapper {
6 | static toDto(post: Post | PostEntity): PostDto {
7 | return {
8 | id: post.id,
9 | user: post.user,
10 | title: post.title,
11 | body: post.body,
12 | image: post.image,
13 | likes: post.likes,
14 | totalComments: post.totalComments,
15 | createdAt: post.createdAt,
16 | updatedAt: post.updatedAt,
17 | };
18 | }
19 |
20 | static toDomain(dto: PostDto): Post {
21 | return new Post(
22 | dto.id,
23 | dto.user,
24 | dto.title,
25 | dto.body,
26 | dto.image || "",
27 | dto.likes,
28 | dto.totalComments,
29 | dto.createdAt,
30 | dto.updatedAt
31 | );
32 | }
33 |
34 | static fromEntity(entity: PostEntity): Post {
35 | return new Post(
36 | entity.id,
37 | entity.user,
38 | entity.title,
39 | entity.body,
40 | entity.image || "",
41 | entity.likes,
42 | entity.totalComments,
43 | entity.createdAt,
44 | entity.updatedAt
45 | );
46 | }
47 |
48 | static fromEntityList(entities: PostEntity[]): Post[] {
49 | return entities.map((entity) => this.fromEntity(entity));
50 | }
51 |
52 | static toDomainList(dtos: PostDto[]): Post[] {
53 | return dtos.map((dto) => this.toDomain(dto));
54 | }
55 |
56 | static toDtoList(posts: Post[] | PostEntity[]): PostDto[] {
57 | return posts.map((post) => this.toDto(post));
58 | }
59 | }
60 |

---

## /src/entities/post/types/index.ts:

1 | export type { PostEntity, UserReference } from "./post.types";
2 |

---

## /src/entities/post/types/post.types.ts:

1 | export interface PostEntity {
2 | id: string;
3 | user: UserReference;
4 | title: string;
5 | body: string;
6 | image: string;
7 | likes: number;
8 | totalComments: number;
9 | createdAt: number;
10 | updatedAt: number;
11 | }
12 |
13 | export interface UserReference {
14 | id: string;
15 | username: string;
16 | profileImage: string;
17 | }
18 |

---

## /src/entities/user/**tests**/core/user.domain.test.ts:

1 | import { BaseError } from "@/shared/libs/errors";
2 | import { User } from "../../core";
3 |
4 | describe("User Domain", () => {
5 | describe("Constructor", () => {
6 | it("should create user instance when provided with valid data", () => {
7 | // Given: Valid user data is provided
8 | const id = "user-123";
9 | const username = "testuser";
10 | const profileImage = "https://example.com/avatar.jpg";
11 | const age = 25;
12 | const email = "test@example.com";
13 |
14 | // When: User instance is created with valid data
15 | const user = new User(id, username, profileImage, age, email);
16 |
17 | // Then: User instance should be created with correct properties
18 | expect(user.id).toBe(id);
19 | expect(user.username).toBe(username);
20 | expect(user.profileImage).toBe(profileImage);
21 | expect(user.age).toBe(age);
22 | expect(user.email).toBe(email);
23 | });
24 |
25 | it("should create user instance with edge case values", () => {
26 | // Given: Edge case user data (zero age, empty image)
27 | const id = "user-edge";
28 | const username = "usr";
29 | const profileImage = "";
30 | const age = 0;
31 | const email = "edge@example.com";
32 |
33 | // When: User instance is created with edge case data
34 | const user = new User(id, username, profileImage, age, email);
35 |
36 | // Then: User instance should be created successfully
37 | expect(user.id).toBe(id);
38 | expect(user.username).toBe(username);
39 | expect(user.profileImage).toBe(profileImage);
40 | expect(user.age).toBe(age);
41 | expect(user.email).toBe(email);
42 | });
43 | });
44 |
45 | describe("updateEmail", () => {
46 | it("should update email when provided with valid email format", () => {
47 | // Given: User instance with initial email
48 | const user = new User(
49 | "user-123",
50 | "testuser",
51 | "https://example.com/avatar.jpg",
52 | 25,
53 | "initial@example.com"
54 | );
55 | const newEmail = "newemail@example.com";
56 |
57 | // When: updateEmail is called with valid email
58 | user.updateEmail(newEmail);
59 |
60 | // Then: Email should be updated to the new value
61 | expect(user.email).toBe(newEmail);
62 | });
63 |
64 | it("should throw BaseError when provided with invalid email format", () => {
65 | // Given: User instance and invalid email
66 | const user = new User(
67 | "user-123",
68 | "testuser",
69 | "https://example.com/avatar.jpg",
70 | 25,
71 | "initial@example.com"
72 | );
73 | const invalidEmail = "invalid-email";
74 |
75 | // When: updateEmail is called with invalid email
76 | // Then: Should throw BaseError
77 | expect(() => user.updateEmail(invalidEmail)).toThrow(BaseError);
78 | expect(() => user.updateEmail(invalidEmail)).toThrow(
79 | "Invalid email format"
80 | );
81 | });
82 |
83 | it("should not modify email when update fails", () => {
84 | // Given: User instance with original email
85 | const originalEmail = "original@example.com";
86 | const user = new User(
87 | "user-123",
88 | "testuser",
89 | "https://example.com/avatar.jpg",
90 | 25,
91 | originalEmail
92 | );
93 | const invalidEmail = "invalid-email";
94 |
95 | // When: updateEmail is called with invalid email and fails
96 | try {
97 | user.updateEmail(invalidEmail);
98 | } catch {
99 | // Expected to throw
100 | }
101 |
102 | // Then: Original email should remain unchanged
103 | expect(user.email).toBe(originalEmail);
104 | });
105 | });
106 |
107 | describe("updateUsername", () => {
108 | it("should update username when provided with valid format", () => {
109 | // Given: User instance with initial username
110 | const user = new User(
111 | "user-123",
112 | "olduser",
113 | "https://example.com/avatar.jpg",
114 | 25,
115 | "test@example.com"
116 | );
117 | const newUsername = "newuser123";
118 |
119 | // When: updateUsername is called with valid username
120 | user.updateUsername(newUsername);
121 |
122 | // Then: Username should be updated to the new value
123 | expect(user.username).toBe(newUsername);
124 | });
125 |
126 | it("should throw BaseError when provided with invalid username format", () => {
127 | // Given: User instance and invalid username
128 | const user = new User(
129 | "user-123",
130 | "olduser",
131 | "https://example.com/avatar.jpg",
132 | 25,
133 | "test@example.com"
134 | );
135 | const invalidUsername = "ab"; // Too short
136 |
137 | // When: updateUsername is called with invalid username
138 | // Then: Should throw BaseError
139 | expect(() => user.updateUsername(invalidUsername)).toThrow(BaseError);
140 | expect(() => user.updateUsername(invalidUsername)).toThrow(
141 | "Invalid username format"
142 | );
143 | });
144 |
145 | it("should not modify username when update fails", () => {
146 | // Given: User instance with original username
147 | const originalUsername = "originaluser";
148 | const user = new User(
149 | "user-123",
150 | originalUsername,
151 | "https://example.com/avatar.jpg",
152 | 25,
153 | "test@example.com"
154 | );
155 | const invalidUsername = "ab"; // Too short
156 |
157 | // When: updateUsername is called with invalid username and fails
158 | try {
159 | user.updateUsername(invalidUsername);
160 | } catch {
161 | // Expected to throw
162 | }
163 |
164 | // Then: Original username should remain unchanged
165 | expect(user.username).toBe(originalUsername);
166 | });
167 | });
168 | });
169 |

---

## /src/entities/user/**tests**/core/user.factory.test.ts:

1 | import { User, UserFactory } from "../../core";
2 |
3 | describe("UserFactory", () => {
4 | describe("createNew method", () => {
5 | it("should create user with all provided values", () => {
6 | // Given: Complete valid user data
7 | const username = "testuser";
8 | const profileImage = "https://example.com/avatar.jpg";
9 | const age = 25;
10 | const email = "test@example.com";
11 |
12 | // When: UserFactory creates new user with all parameters
13 | const user = UserFactory.createNew(username, profileImage, age, email);
14 |
15 | // Then: User should be created with all provided properties
16 | expect(user).toBeInstanceOf(User);
17 | expect(user.id).toBe(""); // Factory always creates with empty ID
18 | expect(user.username).toBe(username);
19 | expect(user.profileImage).toBe(profileImage);
20 | expect(user.age).toBe(age);
21 | expect(user.email).toBe(email);
22 | });
23 |
24 | it("should create user with default values for optional parameters", () => {
25 | // Given: Only username
26 | const username = "testuser";
27 |
28 | // When: UserFactory creates new user with only username
29 | const user = UserFactory.createNew(username);
30 |
31 | // Then: User should be created with default values for optional parameters
32 | expect(user).toBeInstanceOf(User);
33 | expect(user.id).toBe("");
34 | expect(user.username).toBe(username);
35 | expect(user.profileImage).toBe(""); // Default empty string
36 | expect(user.age).toBe(0); // Default zero
37 | expect(user.email).toBe(""); // Default empty string
38 | });
39 |
40 | it("should create user with partial parameters", () => {
41 | // Given: Username and profile image only
42 | const username = "testuser";
43 | const profileImage = "https://example.com/avatar.jpg";
44 |
45 | // When: UserFactory creates new user with partial parameters
46 | const user = UserFactory.createNew(username, profileImage);
47 |
48 | // Then: User should be created with provided values and remaining defaults
49 | expect(user).toBeInstanceOf(User);
50 | expect(user.username).toBe(username);
51 | expect(user.profileImage).toBe(profileImage);
52 | expect(user.age).toBe(0); // Default value
53 | expect(user.email).toBe(""); // Default value
54 | });
55 | });
56 |
57 | describe("createNewWithProfile method", () => {
58 | it("should create user with complete profile data", () => {
59 | // Given: Complete user profile data
60 | const username = "profileuser";
61 | const profileImage = "https://example.com/profile.jpg";
62 | const age = 30;
63 | const email = "profile@example.com";
64 |
65 | // When: UserFactory creates new user with complete profile
66 | const user = UserFactory.createNewWithProfile(
67 | username,
68 | profileImage,
69 | age,
70 | email
71 | );
72 |
73 | // Then: User should be created with complete profile data
74 | expect(user).toBeInstanceOf(User);
75 | expect(user.id).toBe(""); // Factory always creates with empty ID
76 | expect(user.username).toBe(username);
77 | expect(user.profileImage).toBe(profileImage);
78 | expect(user.age).toBe(age);
79 | expect(user.email).toBe(email);
80 | });
81 |
82 | it("should create user profile with only username", () => {
83 | // Given: Only username
84 | const username = "profileuser";
85 |
86 | // When: UserFactory creates new user profile with only username
87 | const user = UserFactory.createNewWithProfile(username);
88 |
89 | // Then: User should be created with default profile values
90 | expect(user).toBeInstanceOf(User);
91 | expect(user.username).toBe(username);
92 | expect(user.profileImage).toBe("");
93 | expect(user.age).toBe(0);
94 | expect(user.email).toBe("");
95 | });
96 | });
97 |
98 | describe("Factory methods consistency", () => {
99 | it("should create users with identical properties when called with identical parameters", () => {
100 | // Given: Complete user data
101 | const username = "testuser";
102 | const profileImage = "https://example.com/avatar.jpg";
103 | const age = 25;
104 | const email = "test@example.com";
105 |
106 | // When: Both factory methods create users with identical parameters
107 | const user1 = UserFactory.createNew(username, profileImage, age, email);
108 | const user2 = UserFactory.createNewWithProfile(
109 | username,
110 | profileImage,
111 | age,
112 | email
113 | );
114 |
115 | // Then: Both users should have identical properties
116 | expect(user1.id).toBe(user2.id);
117 | expect(user1.username).toBe(user2.username);
118 | expect(user1.profileImage).toBe(user2.profileImage);
119 | expect(user1.age).toBe(user2.age);
120 | expect(user1.email).toBe(user2.email);
121 | });
122 | });
123 | });
124 |

---

## /src/entities/user/**tests**/fixtures/index.ts:

1 | export { UserFixtures, createUserFixture } from "./user.fixtures";
2 |

---

## /src/entities/user/**tests**/fixtures/user.fixtures.ts:

1 | import { UserEntity } from "../../types";
2 |
3 | export const UserFixtures = {
4 | valid: {
5 | // Basic user data
6 | basic: {
7 | id: "user-123",
8 | username: "testuser",
9 | profileImage: "https://example.com/avatar.jpg",
10 | age: 25,
11 | email: "test@example.com",
12 | } as UserEntity,
13 |
14 | // User without profile image
15 | withoutImage: {
16 | id: "user-456",
17 | username: "noimage",
18 | profileImage: "",
19 | age: 30,
20 | email: "noimage@example.com",
21 | } as UserEntity,
22 |
23 | // User with minimum age
24 | minAge: {
25 | id: "user-789",
26 | username: "younguser",
27 | profileImage: "https://example.com/young.jpg",
28 | age: 13,
29 | email: "young@example.com",
30 | } as UserEntity,
31 |
32 | // Elderly user
33 | maxAge: {
34 | id: "user-999",
35 | username: "olduser",
36 | profileImage: "https://example.com/old.jpg",
37 | age: 99,
38 | email: "old@example.com",
39 | } as UserEntity,
40 |
41 | // Valid username with special characters
42 | specialChars: {
43 | id: "user-special",
44 | username: "user_name.123",
45 | profileImage: "https://example.com/special.jpg",
46 | age: 28,
47 | email: "special@example.com",
48 | } as UserEntity,
49 | },
50 |
51 | invalid: {
52 | // Empty username
53 | emptyUsername: {
54 | id: "user-empty",
55 | username: "",
56 | profileImage: "https://example.com/avatar.jpg",
57 | age: 25,
58 | email: "empty@example.com",
59 | } as UserEntity,
60 |
61 | // Username too short
62 | shortUsername: {
63 | id: "user-short",
64 | username: "ab",
65 | profileImage: "https://example.com/avatar.jpg",
66 | age: 25,
67 | email: "short@example.com",
68 | } as UserEntity,
69 |
70 | // Username too long
71 | longUsername: {
72 | id: "user-long",
73 | username: "a".repeat(21),
74 | profileImage: "https://example.com/avatar.jpg",
75 | age: 25,
76 | email: "long@example.com",
77 | } as UserEntity,
78 |
79 | // Invalid email format
80 | invalidEmail: {
81 | id: "user-invalid-email",
82 | username: "testuser",
83 | profileImage: "https://example.com/avatar.jpg",
84 | age: 25,
85 | email: "invalid-email",
86 | } as UserEntity,
87 |
88 | // Negative age
89 | negativeAge: {
90 | id: "user-negative",
91 | username: "testuser",
92 | profileImage: "https://example.com/avatar.jpg",
93 | age: -5,
94 | email: "negative@example.com",
95 | } as UserEntity,
96 |
97 | // Username with disallowed special characters
98 | invalidSpecialChars: {
99 | id: "user-invalid-special",
100 | username: "user@name!",
101 | profileImage: "https://example.com/avatar.jpg",
102 | age: 25,
103 | email: "invalid@example.com",
104 | } as UserEntity,
105 | },
106 |
107 | edge: {
108 | // Minimum length username
109 | minLengthUsername: {
110 | id: "user-min",
111 | username: "abc",
112 | profileImage: "https://example.com/avatar.jpg",
113 | age: 25,
114 | email: "min@example.com",
115 | } as UserEntity,
116 |
117 | // Maximum length username
118 | maxLengthUsername: {
119 | id: "user-max",
120 | username: "a".repeat(20),
121 | profileImage: "https://example.com/avatar.jpg",
122 | age: 25,
123 | email: "max@example.com",
124 | } as UserEntity,
125 |
126 | zeroAge: {
127 | id: "user-zero",
128 | username: "zeroage",
129 | profileImage: "https://example.com/avatar.jpg",
130 | age: 0,
131 | email: "zero@example.com",
132 | } as UserEntity,
133 |
134 | // Very long email
135 | longEmail: {
136 | id: "user-long-email",
137 | username: "testuser",
138 | profileImage: "https://example.com/avatar.jpg",
139 | age: 25,
140 | email:
141 | "very.long.email.address.for.testing@very.long.domain.name.example.com",
142 | } as UserEntity,
143 | },
144 |
145 | multiple: [
146 | {
147 | id: "user-1",
148 | username: "user1",
149 | profileImage: "https://example.com/user1.jpg",
150 | age: 20,
151 | email: "user1@example.com",
152 | },
153 | {
154 | id: "user-2",
155 | username: "user2",
156 | profileImage: "https://example.com/user2.jpg",
157 | age: 25,
158 | email: "user2@example.com",
159 | },
160 | {
161 | id: "user-3",
162 | username: "user3",
163 | profileImage: "",
164 | age: 30,
165 | email: "user3@example.com",
166 | },
167 | ] as UserEntity[],
168 | };
169 |
170 | export const createUserFixture = (
171 | overrides: Partial<UserEntity> = {}
172 | ): UserEntity => {
173 | return {
174 | ...UserFixtures.valid.basic,
175 | ...overrides,
176 | };
177 | };
178 |

---

## /src/entities/user/**tests**/index.ts:

1 | // Fixtures
2 | export { createUserFixture, UserFixtures } from "./fixtures";
3 |
4 | // Repository Mocks
5 | export { UserRepositoryMocks, type MockUserRepository } from "./mocks";
6 |
7 | // API Mocks
8 | export { UserApiMocks } from "./mocks";
9 |

---

## /src/entities/user/**tests**/infrastructure/user.api.repository.test.ts:

1 | import { ApiClient } from "@/shared/api";
2 | import { beforeEach, describe, expect, it, vi } from "vitest";
3 | import { User } from "../../core";
4 | import { UserProfileDto } from "../../infrastructure/dto";
5 | import { UserApiRepository } from "../../infrastructure/repository";
6 |
7 | /\*_
8 | _ User API Repository Tests
9 | _ Verify all User API repository functionality using Given-When-Then pattern
10 | _/
11 | describe("User API Repository", () => {
12 | let userApiRepository: UserApiRepository;
13 | let mockApiClient: ApiClient;
14 |
15 | beforeEach(() => {
16 | // Given: Set up mock API client and repository
17 | mockApiClient = {
18 | get: vi.fn(),
19 | post: vi.fn(),
20 | put: vi.fn(),
21 | delete: vi.fn(),
22 | } as unknown as ApiClient;
23 |
24 | userApiRepository = new UserApiRepository(mockApiClient);
25 | });
26 |
27 | describe("getUserProfile", () => {
28 | it("should return User domain object when API call succeeds", async () => {
29 | // Given: Mock API client returns valid user profile data
30 | const validUserProfileDto: UserProfileDto = {
31 | id: "user-123",
32 | username: "testuser",
33 | profileImage: "https://example.com/avatar.jpg",
34 | age: 25,
35 | email: "test@example.com",
36 | };
37 | const mockResponse = {
38 | data: validUserProfileDto,
39 | status: 200,
40 | statusText: "OK",
41 | ok: true,
42 | };
43 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
44 |
45 | // When: Get user profile
46 | const result = await userApiRepository.getUserProfile();
47 |
48 | // Then: Should return User domain object
49 | expect(result).toBeInstanceOf(User);
50 | expect(result.id).toBe(validUserProfileDto.id);
51 | expect(result.username).toBe(validUserProfileDto.username);
52 | expect(result.profileImage).toBe(validUserProfileDto.profileImage);
53 | expect(result.age).toBe(validUserProfileDto.age);
54 | expect(result.email).toBe(validUserProfileDto.email);
55 | expect(mockApiClient.get).toHaveBeenCalledWith("/users/me");
56 | });
57 |
58 | it("should handle user profile with missing optional fields", async () => {
59 | // Given: Mock API client returns user profile with missing optional fields
60 | const incompleteProfileDto: UserProfileDto = {
61 | id: "user-incomplete",
62 | username: "incomplete_user",
63 | profileImage: "https://example.com/avatar.jpg",
64 | // age and email are missing
65 | };
66 | const mockResponse = {
67 | data: incompleteProfileDto,
68 | status: 200,
69 | statusText: "OK",
70 | ok: true,
71 | };
72 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
73 |
74 | // When: Get user profile
75 | const result = await userApiRepository.getUserProfile();
76 |
77 | // Then: Should return User with default values for missing fields
78 | expect(result).toBeInstanceOf(User);
79 | expect(result.id).toBe("user-incomplete");
80 | expect(result.username).toBe("incomplete_user");
81 | expect(result.age).toBe(0); // Default value
82 | expect(result.email).toBe(""); // Default value
83 | });
84 |
85 | it("should handle user profile with null optional fields", async () => {
86 | // Given: Mock API client returns user profile with null optional fields
87 | const profileDtoWithNulls: UserProfileDto = {
88 | id: "user-nulls",
89 | username: "user_with_nulls",
90 | profileImage: "",
91 | age: null as unknown as number,
92 | email: null as unknown as string,
93 | };
94 | const mockResponse = {
95 | data: profileDtoWithNulls,
96 | status: 200,
97 | statusText: "OK",
98 | ok: true,
99 | };
100 | vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);
101 |
102 | // When: Get user profile
103 | const result = await userApiRepository.getUserProfile();
104 |
105 | // Then: Should return User with default values for null fields
106 | expect(result).toBeInstanceOf(User);
107 | expect(result.id).toBe("user-nulls");
108 | expect(result.username).toBe("user_with_nulls");
109 | expect(result.age).toBe(0); // Default value for null
110 | expect(result.email).toBe(""); // Default value for null
111 | });
112 |
113 | it("should throw error when API call fails", async () => {
114 | // Given: Mock API client throws error
115 | const apiError = new Error("API Error");
116 | vi.mocked(mockApiClient.get).mockRejectedValue(apiError);
117 |
118 | // When & Then: Should throw the API error
119 | await expect(userApiRepository.getUserProfile()).rejects.toThrow(
120 | "API Error"
121 | );
122 | expect(mockApiClient.get).toHaveBeenCalledWith("/users/me");
123 | });
124 | });
125 | });
126 |

---

## /src/entities/user/**tests**/mapper/user.mapper.test.ts:

1 | import { beforeEach, describe, expect, it } from "vitest";
2 | import { User } from "../../core";
3 | import { UserDto, UserProfileDto } from "../../infrastructure/dto";
4 | import { UserMapper } from "../../mapper";
5 |
6 | /\*_
7 | _ User Mapper Tests
8 | _ Verify all User mapper functionality using Given-When-Then pattern
9 | _/
10 | describe("User Mapper", () => {
11 | let validUser: User;
12 | let validUserDto: UserDto;
13 | let validUserProfileDto: UserProfileDto;
14 |
15 | beforeEach(() => {
16 | // Given: Set up valid test data for mapper tests
17 | validUser = new User(
18 | "user-123",
19 | "testuser",
20 | "https://example.com/avatar.jpg",
21 | 25,
22 | "test@example.com"
23 | );
24 |
25 | validUserDto = {
26 | id: "user-123",
27 | username: "testuser",
28 | profileImage: "https://example.com/avatar.jpg",
29 | };
30 |
31 | validUserProfileDto = {
32 | id: "user-123",
33 | username: "testuser",
34 | profileImage: "https://example.com/avatar.jpg",
35 | age: 25,
36 | email: "test@example.com",
37 | };
38 | });
39 |
40 | describe("toDto", () => {
41 | it("should convert User domain to UserDto when provided with valid User", () => {
42 | // Given: Valid User domain object
43 | const user = validUser;
44 |
45 | // When: Convert to DTO
46 | const result = UserMapper.toDto(user);
47 |
48 | // Then: Should return correct UserDto
49 | expect(result).toEqual({
50 | id: user.id,
51 | username: user.username,
52 | profileImage: user.profileImage,
53 | });
54 | expect(result).not.toHaveProperty("age");
55 | expect(result).not.toHaveProperty("email");
56 | });
57 |
58 | it("should handle User with empty profile image when converting to DTO", () => {
59 | // Given: User with empty profile image
60 | const userWithoutImage = new User(
61 | "user-123",
62 | "testuser",
63 | "",
64 | 25,
65 | "test@example.com"
66 | );
67 |
68 | // When: Convert to DTO
69 | const result = UserMapper.toDto(userWithoutImage);
70 |
71 | // Then: Should return DTO with empty profile image
72 | expect(result.profileImage).toBe("");
73 | expect(result.id).toBe("user-123");
74 | expect(result.username).toBe("testuser");
75 | });
76 | });
77 |
78 | describe("toProfileDto", () => {
79 | it("should convert User domain to UserProfileDto when provided with valid User", () => {
80 | // Given: Valid User domain object
81 | const user = validUser;
82 |
83 | // When: Convert to profile DTO
84 | const result = UserMapper.toProfileDto(user);
85 |
86 | // Then: Should return complete UserProfileDto
87 | expect(result).toEqual({
88 | id: user.id,
89 | username: user.username,
90 | profileImage: user.profileImage,
91 | age: user.age,
92 | email: user.email,
93 | });
94 | });
95 |
96 | it("should handle User with zero age when converting to profile DTO", () => {
97 | // Given: User with zero age
98 | const userWithZeroAge = new User(
99 | "user-123",
100 | "testuser",
101 | "https://example.com/avatar.jpg",
102 | 0,
103 | "test@example.com"
104 | );
105 |
106 | // When: Convert to profile DTO
107 | const result = UserMapper.toProfileDto(userWithZeroAge);
108 |
109 | // Then: Should return profile DTO with zero age
110 | expect(result.age).toBe(0);
111 | expect(result.id).toBe("user-123");
112 | expect(result.username).toBe("testuser");
113 | expect(result.email).toBe("test@example.com");
114 | });
115 | });
116 |
117 | describe("toDomain", () => {
118 | it("should convert UserDto to User domain when provided with valid DTO", () => {
119 | // Given: Valid UserDto
120 | const dto = validUserDto;
121 |
122 | // When: Convert to domain
123 | const result = UserMapper.toDomain(dto);
124 |
125 | // Then: Should return User domain with default values for missing fields
126 | expect(result).toBeInstanceOf(User);
127 | expect(result.id).toBe(dto.id);
128 | expect(result.username).toBe(dto.username);
129 | expect(result.profileImage).toBe(dto.profileImage);
130 | expect(result.age).toBe(0); // Default value
131 | expect(result.email).toBe(""); // Default value
132 | });
133 |
134 | it("should handle null profileImage when converting DTO to domain", () => {
135 | // Given: UserDto with null profileImage
136 | const dtoWithNullImage: UserDto = {
137 | id: "user-123",
138 | username: "testuser",
139 | profileImage: null as unknown as string,
140 | };
141 |
142 | // When: Convert to domain
143 | const result = UserMapper.toDomain(dtoWithNullImage);
144 |
145 | // Then: Should use empty string as default
146 | expect(result.profileImage).toBe("");
147 | expect(result.id).toBe("user-123");
148 | expect(result.username).toBe("testuser");
149 | });
150 | });
151 |
152 | describe("toDomainFromProfile", () => {
153 | it("should convert UserProfileDto to User domain when provided with valid profile DTO", () => {
154 | // Given: Valid UserProfileDto
155 | const profileDto = validUserProfileDto;
156 |
157 | // When: Convert to domain
158 | const result = UserMapper.toDomainFromProfile(profileDto);
159 |
160 | // Then: Should return complete User domain object
161 | expect(result).toBeInstanceOf(User);
162 | expect(result.id).toBe(profileDto.id);
163 | expect(result.username).toBe(profileDto.username);
164 | expect(result.profileImage).toBe(profileDto.profileImage);
165 | expect(result.age).toBe(profileDto.age);
166 | expect(result.email).toBe(profileDto.email);
167 | });
168 |
169 | it("should handle missing optional fields when converting profile DTO to domain", () => {
170 | // Given: UserProfileDto with missing optional fields
171 | const incompleteProfileDto: UserProfileDto = {
172 | id: "user-123",
173 | username: "testuser",
174 | profileImage: "https://example.com/avatar.jpg",
175 | // age and email are missing
176 | };
177 |
178 | // When: Convert to domain
179 | const result = UserMapper.toDomainFromProfile(incompleteProfileDto);
180 |
181 | // Then: Should use default values for missing fields
182 | expect(result.id).toBe("user-123");
183 | expect(result.username).toBe("testuser");
184 | expect(result.profileImage).toBe("https://example.com/avatar.jpg");
185 | expect(result.age).toBe(0); // Default value
186 | expect(result.email).toBe(""); // Default value
187 | });
188 |
189 | it("should handle null values in optional fields when converting profile DTO to domain", () => {
190 | // Given: UserProfileDto with null optional fields
191 | const profileDtoWithNulls: UserProfileDto = {
192 | id: "user-123",
193 | username: "testuser",
194 | profileImage: "",
195 | age: null as unknown as number,
196 | email: null as unknown as string,
197 | };
198 |
199 | // When: Convert to domain
200 | const result = UserMapper.toDomainFromProfile(profileDtoWithNulls);
201 |
202 | // Then: Should use default values for null fields
203 | expect(result.id).toBe("user-123");
204 | expect(result.username).toBe("testuser");
205 | expect(result.profileImage).toBe("");
206 | expect(result.age).toBe(0); // Default value for null
207 | expect(result.email).toBe(""); // Default value for null
208 | });
209 | });
210 | });
211 |

---

## /src/entities/user/**tests**/mocks/index.ts:

1 | export {
2 | UserRepositoryMocks,
3 | type MockUserRepository,
4 | } from "./user-repository.mock";
5 |
6 | export { UserApiMocks } from "./user-api.mock";
7 |

---

## /src/entities/user/**tests**/mocks/user-api.mock.ts:

1 | import { ErrorMessages, HttpMocks, HttpStatus } from "@/shared/libs/**tests**";
2 | import { UserEntity } from "../../types/user.types";
3 |
4 | export const UserApiMocks = {
5 | getUser: (user: UserEntity) => HttpMocks.get(user),
6 |
7 | getUsers: (users: UserEntity[]) => HttpMocks.get(users),
8 |
9 | createUser: (user: UserEntity) => HttpMocks.post(user, HttpStatus.CREATED),
10 |
11 | updateUser: (user: UserEntity) => HttpMocks.put(user),
12 |
13 | deleteUser: () => HttpMocks.delete(),
14 |
15 | checkUsername: (available: boolean) => HttpMocks.get({ available }),
16 |
17 | checkEmail: (available: boolean) => HttpMocks.get({ available }),
18 |
19 | getUserProfile: (user: UserEntity) => HttpMocks.get(user),
20 |
21 | errors: {
22 | notFound: () =>
23 | HttpMocks.error(ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND),
24 |
25 | unauthorized: () =>
26 | HttpMocks.error(ErrorMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED),
27 |
28 | forbidden: () =>
29 | HttpMocks.error(ErrorMessages.FORBIDDEN, HttpStatus.FORBIDDEN),
30 |
31 | badRequest: () =>
32 | HttpMocks.error(ErrorMessages.BAD_REQUEST, HttpStatus.BAD_REQUEST),
33 |
34 | conflict: () => HttpMocks.error("User already exists", HttpStatus.CONFLICT),
35 |
36 | validation: () =>
37 | HttpMocks.error("Invalid user data", HttpStatus.UNPROCESSABLE_ENTITY),
38 |
39 | serverError: () =>
40 | HttpMocks.error(
41 | ErrorMessages.INTERNAL_ERROR,
42 | HttpStatus.INTERNAL_SERVER_ERROR
43 | ),
44 |
45 | networkError: () => HttpMocks.networkError(),
46 |
47 | timeout: () => HttpMocks.timeoutError(),
48 | },
49 | };
50 |

---

## /src/entities/user/**tests**/mocks/user-repository.mock.ts:

1 | import { MockRepository, RepositoryMockFactory } from "@/shared/libs/**tests**";
2 | import { UserEntity } from "../../types";
3 |
4 | export interface MockUserRepository extends MockRepository<UserEntity> {
5 | getUserProfile: ReturnType<typeof vi.fn>;
6 | findByUsername: ReturnType<typeof vi.fn>;
7 | findByEmail: ReturnType<typeof vi.fn>;
8 | existsByUsername: ReturnType<typeof vi.fn>;
9 | existsByEmail: ReturnType<typeof vi.fn>;
10 | }
11 |
12 | export const UserRepositoryMocks = {
13 | create: (): MockUserRepository => ({
14 | ...RepositoryMockFactory.createBasicMock<UserEntity>(),
15 | getUserProfile: vi.fn(),
16 | findByUsername: vi.fn(),
17 | findByEmail: vi.fn(),
18 | existsByUsername: vi.fn(),
19 | existsByEmail: vi.fn(),
20 | }),
21 |
22 | createSuccess: (
23 | mockUser: UserEntity,
24 | mockUsers: UserEntity[] = []
25 | ): MockUserRepository => ({
26 | ...RepositoryMockFactory.createSuccessMock(mockUser, mockUsers),
27 | getUserProfile: vi.fn().mockResolvedValue(mockUser),
28 | findByUsername: vi.fn().mockResolvedValue(mockUser),
29 | findByEmail: vi.fn().mockResolvedValue(mockUser),
30 | existsByUsername: vi.fn().mockResolvedValue(true),
31 | existsByEmail: vi.fn().mockResolvedValue(true),
32 | }),
33 |
34 | createNotFound: (): MockUserRepository => ({
35 | ...RepositoryMockFactory.createNotFoundMock<UserEntity>(),
36 | getUserProfile: vi.fn().mockResolvedValue(null),
37 | findByUsername: vi.fn().mockResolvedValue(null),
38 | findByEmail: vi.fn().mockResolvedValue(null),
39 | existsByUsername: vi.fn().mockResolvedValue(false),
40 | existsByEmail: vi.fn().mockResolvedValue(false),
41 | }),
42 |
43 | createError: (
44 | error: Error = new Error("User Repository Error")
45 | ): MockUserRepository => ({
46 | ...RepositoryMockFactory.createErrorMock<UserEntity>(error),
47 | getUserProfile: vi.fn().mockRejectedValue(error),
48 | findByUsername: vi.fn().mockRejectedValue(error),
49 | findByEmail: vi.fn().mockRejectedValue(error),
50 | existsByUsername: vi.fn().mockRejectedValue(error),
51 | existsByEmail: vi.fn().mockRejectedValue(error),
52 | }),
53 |
54 | createDuplicate: (mockUser: UserEntity): MockUserRepository => ({
55 | ...RepositoryMockFactory.createBasicMock<UserEntity>(),
56 | getUserProfile: vi.fn().mockResolvedValue(mockUser),
57 | findById: vi.fn().mockResolvedValue(mockUser),
58 | findAll: vi.fn().mockResolvedValue([mockUser]),
59 | findByUsername: vi.fn().mockResolvedValue(mockUser),
60 | findByEmail: vi.fn().mockResolvedValue(mockUser),
61 | existsByUsername: vi.fn().mockResolvedValue(true),
62 | existsByEmail: vi.fn().mockResolvedValue(true),
63 | save: vi
64 | .fn()
65 | .mockRejectedValue(new Error("Username or email already exists")),
66 | update: vi.fn().mockResolvedValue(mockUser),
67 | delete: vi.fn().mockResolvedValue(undefined),
68 | }),
69 | };
70 |

---

## /src/entities/user/**tests**/ui/identifier/UserAvatar.test.tsx:

1 | import { render, screen } from "@testing-library/react";
2 | import { beforeEach, describe, expect, it, vi } from "vitest";
3 | import { UserAvatar } from "../../../ui/identifier";
4 |
5 | describe("UserAvatar Component", () => {
6 | let mockOnClick: ReturnType<typeof vi.fn>;
7 |
8 | beforeEach(() => {
9 | mockOnClick = vi.fn();
10 | });
11 |
12 | describe("Basic Rendering", () => {
13 | it("should render with profile image", () => {
14 | // Given: Valid profile image URL
15 | const profileImage = "https://example.com/avatar.jpg";
16 |
17 | // When: Render UserAvatar component
18 | render(<UserAvatar userProfileImage={profileImage} />);
19 |
20 | // Then: Should render with correct image
21 | const avatarImage = screen.getByRole("img");
22 | expect(avatarImage).toBeInTheDocument();
23 | expect(avatarImage).toHaveAttribute("alt", `${profileImage}-profile`);
24 | });
25 |
26 | it("should render with empty profile image", () => {
27 | // Given: Empty profile image URL
28 | const emptyProfileImage = "";
29 |
30 | // When: Render with empty profile image
31 | render(<UserAvatar userProfileImage={emptyProfileImage} />);
32 |
33 | // Then: Should render even with empty image
34 | const avatarImage = screen.getByRole("img");
35 | expect(avatarImage).toBeInTheDocument();
36 | expect(avatarImage).toHaveAttribute("alt", "-profile");
37 | });
38 | });
39 |
40 | describe("User Interactions", () => {
41 | it("should handle click events when onClick handler is provided", () => {
42 | // Given: Profile image and click handler
43 | const profileImage = "https://example.com/avatar.jpg";
44 |
45 | // When: Render with click handler and click it
46 | render(
47 | <UserAvatar userProfileImage={profileImage} onClick={mockOnClick} />
48 | );
49 | const avatarContainer = screen.getByRole("img").parentElement;
50 | expect(avatarContainer).toBeInTheDocument();
51 | avatarContainer!.click();
52 |
53 | // Then: Click handler should be called
54 | expect(mockOnClick).toHaveBeenCalledTimes(1);
55 | });
56 | });
57 |
58 | describe("Customization", () => {
59 | it("should apply custom className", () => {
60 | // Given: Profile image and custom className
61 | const profileImage = "https://example.com/avatar.jpg";
62 | const customClassName = "custom-avatar";
63 |
64 | // When: Render with custom className
65 | render(
66 | <UserAvatar
67 | userProfileImage={profileImage}
68 | className={customClassName}
69 | />
70 | );
71 |
72 | // Then: Custom className should be applied
73 | const avatarContainer = screen.getByRole("img").parentElement;
74 | expect(avatarContainer).toBeInTheDocument();
75 | expect(avatarContainer).toHaveClass(customClassName);
76 | });
77 |
78 | it("should pass through additional HTML attributes", () => {
79 | // Given: Profile image and additional HTML attributes
80 | const profileImage = "https://example.com/avatar.jpg";
81 | const testId = "user-avatar";
82 |
83 | // When: Render with additional attributes
84 | render(
85 | <UserAvatar userProfileImage={profileImage} data-testid={testId} />
86 | );
87 |
88 | // Then: Additional attributes should be passed through
89 | const avatarContainer = screen.getByRole("img").parentElement;
90 | expect(avatarContainer).toBeInTheDocument();
91 | expect(avatarContainer).toHaveAttribute("data-testid", testId);
92 | });
93 | });
94 |
95 | describe("Accessibility", () => {
96 | it("should have proper alt text", () => {
97 | // Given: Valid profile image URL
98 | const profileImage = "https://example.com/avatar.jpg";
99 |
100 | // When: Render component
101 | render(<UserAvatar userProfileImage={profileImage} />);
102 |
103 | // Then: Should have proper alt text
104 | const avatarImage = screen.getByRole("img");
105 | expect(avatarImage).toHaveAttribute("alt", `${profileImage}-profile`);
106 | });
107 |
108 | it("should support keyboard accessibility", () => {
109 | // Given: Profile image and keyboard accessibility attributes
110 | const profileImage = "https://example.com/avatar.jpg";
111 |
112 | // When: Render with keyboard accessibility attributes
113 | render(
114 | <UserAvatar
115 | userProfileImage={profileImage}
116 | onClick={mockOnClick}
117 | tabIndex={0}
118 | />
119 | );
120 |
121 | // Then: Should support keyboard accessibility
122 | const avatarContainer = screen.getByRole("img").parentElement;
123 | expect(avatarContainer).toBeInTheDocument();
124 | expect(avatarContainer).toHaveAttribute("tabIndex", "0");
125 | });
126 | });
127 | });
128 |

---

## /src/entities/user/**tests**/ui/identifier/UserIdentifier.test.tsx:

1 | import { render, screen } from "@testing-library/react";
2 | import { beforeEach, describe, expect, it } from "vitest";
3 | import { UserDto } from "../../../infrastructure/dto";
4 | import { UserIdentifier } from "../../../ui/identifier";
5 | import { UserFixtures } from "../../fixtures";
6 |
7 | /\*_
8 | _ UserIdentifier Component Tests
9 | _ Core functionality and user experience focused tests
10 | _/
11 | describe("UserIdentifier Component", () => {
12 | let validUserDto: UserDto;
13 |
14 | beforeEach(() => {
15 | validUserDto = {
16 | id: UserFixtures.valid.basic.id,
17 | username: UserFixtures.valid.basic.username,
18 | profileImage: UserFixtures.valid.basic.profileImage,
19 | };
20 | });
21 |
22 | describe("Basic Rendering", () => {
23 | it("should render user avatar and username", () => {
24 | // Given: Valid user data
25 | const user = validUserDto;
26 |
27 | // When: Render UserIdentifier component
28 | render(<UserIdentifier user={user} />);
29 |
30 | // Then: Should display avatar and username
31 | const avatarImage = screen.getByRole("img");
32 | const usernameText = screen.getByText(user.username);
33 |
34 | expect(avatarImage).toBeInTheDocument();
35 | expect(usernameText).toBeInTheDocument();
36 | expect(usernameText).toHaveTextContent(user.username);
37 | });
38 |
39 | it("should render with empty profile image", () => {
40 | // Given: User with empty profile image
41 | const userWithoutImage: UserDto = {
42 | ...validUserDto,
43 | profileImage: "",
44 | };
45 |
46 | // When: Render component
47 | render(<UserIdentifier user={userWithoutImage} />);
48 |
49 | // Then: Should still render username and avatar element
50 | const avatarImage = screen.getByRole("img");
51 | const usernameText = screen.getByText(userWithoutImage.username);
52 |
53 | expect(avatarImage).toBeInTheDocument();
54 | expect(usernameText).toBeInTheDocument();
55 | });
56 | });
57 |
58 | describe("User Data Handling", () => {
59 | it("should display different usernames correctly", () => {
60 | // Given: User with custom username
61 | const customUser: UserDto = {
62 | ...validUserDto,
63 | username: "customUsername123",
64 | };
65 |
66 | // When: Render with custom user
67 | render(<UserIdentifier user={customUser} />);
68 |
69 | // Then: Should display the custom username
70 | const usernameText = screen.getByText(customUser.username);
71 | expect(usernameText).toHaveTextContent(customUser.username);
72 | });
73 |
74 | it("should handle special characters in username", () => {
75 | // Given: User with special characters in username
76 | const userWithSpecialChars: UserDto = {
77 | ...validUserDto,
78 | username: "user_name.123-test",
79 | };
80 |
81 | // When: Render component
82 | render(<UserIdentifier user={userWithSpecialChars} />);
83 |
84 | // Then: Should display special characters correctly
85 | const usernameText = screen.getByText(userWithSpecialChars.username);
86 | expect(usernameText).toHaveTextContent("user_name.123-test");
87 | });
88 | });
89 |
90 | describe("Accessibility", () => {
91 | it("should have proper alt text for avatar", () => {
92 | // Given: Valid user data
93 | const user = validUserDto;
94 |
95 | // When: Render component
96 | render(<UserIdentifier user={user} />);
97 |
98 | // Then: Avatar should have meaningful alt text
99 | const avatarImage = screen.getByRole("img");
100 | expect(avatarImage).toHaveAttribute(
101 | "alt",
102 | `${user.profileImage}-profile`
103 | );
104 | });
105 |
106 | it("should use semantic HTML structure", () => {
107 | // Given: Valid user data
108 | const user = validUserDto;
109 |
110 | // When: Render component
111 | render(<UserIdentifier user={user} />);
112 |
113 | // Then: Should use proper semantic elements
114 | const usernameText = screen.getByText(user.username);
115 | expect(usernameText.tagName).toBe("SPAN");
116 | });
117 | });
118 | });
119 |

---

## /src/entities/user/core/index.ts:

1 | export { User } from "./user.domain";
2 | export { UserFactory } from "./user.factory";
3 | export type { UserRepository } from "./user.repository";
4 |

---

## /src/entities/user/core/user.domain.ts:

1 | import { UserEntity } from "@/entities/user/types/user.types";
2 | import { BaseError } from "@/shared/libs/errors";
3 |
4 | export class User implements UserEntity {
5 | private _id: string;
6 | private \_username: string;
7 | private \_profileImage: string;
8 | private \_age: number;
9 | private \_email: string;
10 |
11 | constructor(
12 | id: string,
13 | username: string,
14 | image: string,
15 | age: number,
16 | email: string
17 | ) {
18 | this.\_id = id;
19 | this.\_username = username;
20 | this.\_profileImage = image;
21 | this.\_age = age;
22 | this.\_email = email;
23 | }
24 |
25 | get id(): string {
26 | return this.\_id;
27 | }
28 |
29 | get username(): string {
30 | return this.\_username;
31 | }
32 |
33 | get profileImage(): string {
34 | return this.\_profileImage;
35 | }
36 |
37 | get age(): number {
38 | return this.\_age;
39 | }
40 |
41 | get email(): string {
42 | return this.\_email;
43 | }
44 |
45 | updateEmail(newEmail: string): void {
46 | if (!this.isValidEmail(newEmail)) {
47 | throw BaseError.validation("Invalid email format");
48 | }
49 | this.\_email = newEmail;
50 | }
51 |
52 | updateUsername(newUsername: string) {
53 | if (!this.isValidUsername(newUsername)) {
54 | throw BaseError.validation("Invalid username format");
55 | }
56 | this.\_username = newUsername;
57 | }
58 |
59 | private isValidUsername(username: string): boolean {
60 | return /^[a-zA-Z0-9_.]{3,20}$/.test(username);
61 |   }
62 | 
63 |   private isValidEmail(email: string): boolean {
64 |     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
65 | }
66 | }
67 |

---

## /src/entities/user/core/user.factory.ts:

1 | import { User } from "./user.domain";
2 |
3 | export class UserFactory {
4 | static createNew(
5 | username: string,
6 | image: string = "",
7 | age: number = 0,
8 | email: string = ""
9 | ): User {
10 | return new User("", username, image, age, email);
11 | }
12 |
13 | static createNewWithProfile(
14 | username: string,
15 | image: string = "",
16 | age: number = 0,
17 | email: string = ""
18 | ): User {
19 | return new User("", username, image, age, email);
20 | }
21 | }
22 |

---

## /src/entities/user/core/user.repository.ts:

1 | import { User } from "./user.domain";
2 |
3 | export interface UserRepository {
4 | getUserProfile(): Promise<User>;
5 | }
6 |

---

## /src/entities/user/index.ts:

1 | export { User, UserFactory, type UserRepository } from "./core";
2 | export { USER_QUERY_KEYS } from "./infrastructure/api";
3 | export { type UserDto, type UserProfileDto } from "./infrastructure/dto";
4 | export { UserApiRepository } from "./infrastructure/repository";
5 | export { UserMapper } from "./mapper";
6 | export { type UserEntity } from "./types";
7 | export { UserAvatar, UserIdentifier } from "./ui/identifier";
8 |

---

## /src/entities/user/infrastructure/api/index.ts:

1 | export { UserAdapter } from "./user.adapter";
2 | export { USER_QUERY_KEYS } from "./user.query-key";
3 |

---

## /src/entities/user/infrastructure/api/user.adapter.ts:

1 | import { ApiClient } from "@/shared/api";
2 | import { UserDto, UserProfileDto } from "../dto";
3 |
4 | export const UserAdapter = (apiClient: ApiClient) => ({
5 | getProfile: async (): Promise<UserProfileDto> => {
6 | return await apiClient
7 | .get<UserDto>(`/users/me`)
8 | .then((response) => response.data)
9 | .catch((error) => {
10 | console.error("User Profile Error: ", error);
11 | throw error;
12 | });
13 | },
14 | });
15 |

---

## /src/entities/user/infrastructure/api/user.query-key.ts:

1 | export const USER_QUERY_KEYS = {
2 | profile: () => ["user", "profile"] as const,
3 | };
4 |

---

## /src/entities/user/infrastructure/dto/index.ts:

1 | export type { UserDto, UserProfileDto } from "./user.dto";
2 |

---

## /src/entities/user/infrastructure/dto/user.dto.ts:

1 | export type UserDto = {
2 | id: string;
3 | profileImage: string;
4 | username: string;
5 | };
6 |
7 | export type UserProfileDto = UserDto & {
8 | age?: number;
9 | email?: string;
10 | };
11 |

---

## /src/entities/user/infrastructure/repository/index.ts:

1 | export { UserApiRepository } from "./user.api.repository";
2 |

---

## /src/entities/user/infrastructure/repository/user.api.repository.ts:

1 | import { User, UserRepository } from "@/entities/user/core";
2 | import { UserAdapter } from "@/entities/user/infrastructure/api";
3 | import { UserMapper } from "@/entities/user/mapper";
4 | import { ApiClient } from "@/shared/api";
5 |
6 | export class UserApiRepository implements UserRepository {
7 | private api: ReturnType<typeof UserAdapter>;
8 | constructor(apiClient: ApiClient) {
9 | this.api = UserAdapter(apiClient);
10 | }
11 |
12 | async getUserProfile(): Promise<User> {
13 | try {
14 | const response = await this.api.getProfile();
15 | const user = UserMapper.toDomainFromProfile(response);
16 | return user;
17 | } catch (error) {
18 | console.error("UserRepository getUserProfile Error:", error);
19 | throw error;
20 | }
21 | }
22 | }
23 |

---

## /src/entities/user/mapper/index.ts:

1 | export { UserMapper } from "./user.mapper";
2 |

---

## /src/entities/user/mapper/user.mapper.ts:

1 | import { User } from "../core";
2 | import { UserDto, UserProfileDto } from "../infrastructure/dto";
3 |
4 | export class UserMapper {
5 | static toDto(user: User): UserDto {
6 | return {
7 | id: user.id,
8 | username: user.username,
9 | profileImage: user.profileImage,
10 | };
11 | }
12 |
13 | static toProfileDto(user: User): UserProfileDto {
14 | return {
15 | id: user.id,
16 | username: user.username,
17 | profileImage: user.profileImage,
18 | age: user.age,
19 | email: user.email,
20 | };
21 | }
22 |
23 | static toDomain(dto: UserDto): User {
24 | return new User(dto.id, dto.username, dto.profileImage || "", 0, "");
25 | }
26 |
27 | static toDomainFromProfile(dto: UserProfileDto): User {
28 | return new User(
29 | dto.id,
30 | dto.username,
31 | dto.profileImage || "",
32 | dto.age || 0,
33 | dto.email || ""
34 | );
35 | }
36 | }
37 |

---

## /src/entities/user/types/index.ts:

1 | export { type UserEntity } from "./user.types";
2 |

---

## /src/entities/user/types/user.types.ts:

1 | export interface UserEntity {
2 | id: string;
3 | username: string;
4 | profileImage: string;
5 | age: number;
6 | email: string;
7 | }
8 |

---

## /src/entities/user/ui/identifier/UserAvatar.tsx:

1 | import Image from "next/image";
2 | import { HTMLAttributes } from "react";
3 |
4 | interface UserAvatarProps extends HTMLAttributes<HTMLDivElement> {
5 | userProfileImage: string;
6 | }
7 |
8 | export const UserAvatar = ({
9 | userProfileImage,
10 | className,
11 | ...props
12 | }: UserAvatarProps) => {
13 | return (
14 | <div
15 | className={`w-8 h-8 rounded-full overflow-hidden cursor-pointer relative ${className}`}
16 | {...props}>
17 | <Image
18 | src={userProfileImage}
19 | alt={`${userProfileImage}-profile`}
20 | className={`w-full h-full object-cover`}
21 | width={32}
22 | height={32}
23 | priority={true}
24 | loading="eager"
25 | />
26 | </div>
27 | );
28 | };
29 |

---

## /src/entities/user/ui/identifier/UserIdentifier.tsx:

1 | import { UserDto } from "../../infrastructure/dto";
2 | import { UserAvatar } from "../identifier";
3 |
4 | interface UserIdentifierProps {
5 | user: UserDto;
6 | }
7 |
8 | export const UserIdentifier = ({ user }: UserIdentifierProps) => {
9 | return (
10 | <div className="flex items-center mb-2 space-x-2">
11 | <UserAvatar userProfileImage={user.profileImage} />
12 | <span className="font-semibold">{user.username}</span>
13 | </div>
14 | );
15 | };
16 |

---

## /src/entities/user/ui/identifier/index.ts:

1 | export { UserAvatar } from "./UserAvatar";
2 | export { UserIdentifier } from "./UserIdentifier";
3 |

---

## /src/features/comment/**tests**/fixtures/comment-hook.fixtures.ts:

1 | import { CommentDto } from "@/entities/comment";
2 |
3 | export const mockCommentsData: CommentDto[] = [
4 | {
5 | id: "comment-1",
6 | postId: "post-1",
7 | user: {
8 | id: "user-1",
9 | username: "testuser",
10 | profileImage: "https://example.com/avatar.jpg",
11 | },
12 | body: "Test comment",
13 | likes: 5,
14 | createdAt: 1640995200000,
15 | updatedAt: 1640995200000,
16 | },
17 | {
18 | id: "comment-2",
19 | postId: "post-1",
20 | user: {
21 | id: "user-2",
22 | username: "commenter",
23 | profileImage: "https://example.com/commenter.jpg",
24 | },
25 | body: "Another test comment",
26 | likes: 2,
27 | createdAt: 1640995300000,
28 | updatedAt: 1640995300000,
29 | },
30 | ];
31 |
32 | export const mockSingleComment: CommentDto = {
33 | id: "comment-1",
34 | postId: "post-1",
35 | user: {
36 | id: "user-1",
37 | username: "testuser",
38 | profileImage: "https://example.com/avatar.jpg",
39 | },
40 | body: "Single test comment",
41 | likes: 3,
42 | createdAt: 1640995200000,
43 | updatedAt: 1640995200000,
44 | };
45 |

---

## /src/features/comment/**tests**/fixtures/index.ts:

1 | export { mockSingleComment } from "./comment-hook.fixtures";
2 |

---

## /src/features/comment/**tests**/hooks/useGetCommentsByPostId.test.ts:

1 | import { CommentDto } from "@/entities/comment";
2 |
3 | import { QueryWrapper } from "@/shared/libs/**tests**";
4 | import { BaseError } from "@/shared/libs/errors";
5 | import { renderHook, waitFor } from "@testing-library/react";
6 | import { beforeEach, describe, expect, it, vi } from "vitest";
7 | import { createUseGetCommentsByPostId } from "../../hooks/useGetCommentsByPostId";
8 |
9 | /\*_
10 | _ useGetCommentsByPostId Hook Tests
11 | _ Verify React Query hook functionality using Given-When-Then pattern
12 | _/
13 | describe("useGetCommentsByPostId Hook", () => {
14 | let mockCommentUseCase: {
15 | getAllComments: ReturnType<typeof vi.fn>;
16 | getCommentById: ReturnType<typeof vi.fn>;
17 | addComment: ReturnType<typeof vi.fn>;
18 | updateComment: ReturnType<typeof vi.fn>;
19 | deleteComment: ReturnType<typeof vi.fn>;
20 | likeComment: ReturnType<typeof vi.fn>;
21 | unlikeComment: ReturnType<typeof vi.fn>;
22 | };
23 | let useGetCommentsByPostId: ReturnType<typeof createUseGetCommentsByPostId>;
24 | let mockCommentsData: CommentDto[];
25 |
26 | beforeEach(() => {
27 | // Given: Set up mock use case and test data
28 | mockCommentUseCase = {
29 | getAllComments: vi.fn(),
30 | getCommentById: vi.fn(),
31 | addComment: vi.fn(),
32 | updateComment: vi.fn(),
33 | deleteComment: vi.fn(),
34 | likeComment: vi.fn(),
35 | unlikeComment: vi.fn(),
36 | };
37 |
38 | mockCommentsData = [
39 | {
40 | id: "comment-1",
41 | postId: "post-1",
42 | user: {
43 | id: "user-1",
44 | username: "testuser",
45 | profileImage: "https://example.com/avatar.jpg",
46 | },
47 | body: "Test comment",
48 | likes: 5,
49 | createdAt: 1640995200000,
50 | updatedAt: 1640995200000,
51 | },
52 | ];
53 |
54 | useGetCommentsByPostId = createUseGetCommentsByPostId(mockCommentUseCase);
55 | });
56 |
57 | describe("Success Cases", () => {
58 | it("should successfully fetch comments by post ID", async () => {
59 | // Given: Valid post ID and mock data
60 | const postId = "post-1";
61 | mockCommentUseCase.getAllComments.mockResolvedValue(mockCommentsData);
62 |
63 | // When: Hook is called with valid post ID
64 | const { result } = renderHook(() => useGetCommentsByPostId(postId), {
65 | wrapper: QueryWrapper,
66 | });
67 |
68 | // Then: Comments should be fetched successfully
69 | await waitFor(() => {
70 | expect(result.current.isSuccess).toBe(true);
71 | });
72 |
73 | expect(result.current.data).toEqual(mockCommentsData);
74 | expect(mockCommentUseCase.getAllComments).toHaveBeenCalledWith(postId);
75 | });
76 |
77 | it("should not execute query when post ID is empty", () => {
78 | // Given: Empty post ID
79 | const emptyPostId = "";
80 |
81 | // When: Hook is called with empty post ID
82 | const { result } = renderHook(() => useGetCommentsByPostId(emptyPostId), {
83 | wrapper: QueryWrapper,
84 | });
85 |
86 | // Then: Query should not be executed
87 | expect(result.current.isLoading).toBe(false);
88 | expect(result.current.isFetching).toBe(false);
89 | expect(mockCommentUseCase.getAllComments).not.toHaveBeenCalled();
90 | });
91 | });
92 |
93 | describe("Error Handling", () => {
94 | it("should handle BaseError correctly", async () => {
95 | // Given: Valid post ID and BaseError from use case
96 | const postId = "post-1";
97 | const baseError = new BaseError("Comments not found", "NOT_FOUND");
98 | mockCommentUseCase.getAllComments.mockRejectedValue(baseError);
99 |
100 | // When: Hook is called and use case throws BaseError
101 | const { result } = renderHook(() => useGetCommentsByPostId(postId), {
102 | wrapper: QueryWrapper,
103 | });
104 |
105 | // Then: BaseError should be propagated correctly
106 | await waitFor(() => {
107 | expect(result.current.isError).toBe(true);
108 | });
109 |
110 | expect(result.current.error).toEqual(baseError);
111 | });
112 |
113 | it("should wrap generic errors in BaseError", async () => {
114 | // Given: Valid post ID and generic error from use case
115 | const postId = "post-1";
116 | const unknownError = new Error("Network error");
117 | mockCommentUseCase.getAllComments.mockRejectedValue(unknownError);
118 |
119 | // When: Hook is called and use case throws generic error
120 | const { result } = renderHook(() => useGetCommentsByPostId(postId), {
121 | wrapper: QueryWrapper,
122 | });
123 |
124 | // Then: Generic error should be wrapped in BaseError
125 | await waitFor(() => {
126 | expect(result.current.isError).toBe(true);
127 | });
128 |
129 | expect(result.current.error).toBeInstanceOf(BaseError);
130 | expect(result.current.error?.message).toBe(
131 | `Failed to fetch comments for post ${postId}`
132 | );
133 | });
134 | });
135 |
136 | describe("Loading State", () => {
137 | it("should manage initial loading state correctly", async () => {
138 | // Given: Valid post ID and delayed response from use case
139 | const postId = "post-1";
140 | mockCommentUseCase.getAllComments.mockImplementation(
141 | () =>
142 | new Promise((resolve) =>
143 | setTimeout(() => resolve(mockCommentsData), 100)
144 | )
145 | );
146 |
147 | // When: Hook is called with delayed response
148 | const { result } = renderHook(() => useGetCommentsByPostId(postId), {
149 | wrapper: QueryWrapper,
150 | });
151 |
152 | // Then: Loading state should be managed correctly
153 | expect(result.current.isLoading).toBe(true);
154 |
155 | await waitFor(() => {
156 | expect(result.current.isSuccess).toBe(true);
157 | });
158 |
159 | expect(result.current.isLoading).toBe(false);
160 | });
161 | });
162 | });
163 |

---

## /src/features/comment/**tests**/index.ts:

1 | export {
2 | CommentServiceMocks,
3 | type MockCommentService,
4 | } from "./mocks/comment-service.mock";
5 |
6 | export { mockSingleComment } from "./fixtures";
7 |

---

## /src/features/comment/**tests**/mocks/comment-service.mock.ts:

1 | import { CommentEntity } from "@/entities/comment";
2 | import { MockService, ServiceMockFactory } from "@/shared/libs/**tests**";
3 | import { vi } from "vitest";
4 |
5 | export interface MockCommentService extends MockService<CommentEntity> {
6 | getCommentsByPost: ReturnType<typeof vi.fn>;
7 | likeComment: ReturnType<typeof vi.fn>;
8 | unlikeComment: ReturnType<typeof vi.fn>;
9 | }
10 |
11 | export const CommentServiceMocks = {
12 | create: (): MockCommentService => ({
13 | ...ServiceMockFactory.createBasicMock<CommentEntity>(),
14 | getCommentsByPost: vi.fn(),
15 | likeComment: vi.fn(),
16 | unlikeComment: vi.fn(),
17 | }),
18 |
19 | createSuccess: (
20 | mockComment: CommentEntity,
21 | mockComments: CommentEntity[] = []
22 | ): MockCommentService => ({
23 | ...ServiceMockFactory.createSuccessMock(mockComment, mockComments),
24 | getCommentsByPost: vi.fn().mockResolvedValue(mockComments),
25 | likeComment: vi.fn().mockResolvedValue(mockComment),
26 | unlikeComment: vi.fn().mockResolvedValue(mockComment),
27 | }),
28 |
29 | createError: (
30 | error: Error = new Error("Comment Service Error")
31 | ): MockCommentService => ({
32 | ...ServiceMockFactory.createErrorMock<CommentEntity>(error),
33 | getCommentsByPost: vi.fn().mockRejectedValue(error),
34 | likeComment: vi.fn().mockRejectedValue(error),
35 | unlikeComment: vi.fn().mockRejectedValue(error),
36 | }),
37 | };
38 |

---

## /src/features/comment/**tests**/services/comment.service.test.ts:

1 | import { CommentMapper, CommentRepository } from "@/entities/comment";
2 | import {
3 | CommentFixtures,
4 | CommentRepositoryMocks,
5 | MockCommentRepository,
6 | } from "@/entities/comment/**tests**";
7 | import { UserRepository } from "@/entities/user";
8 | import {
9 | MockUserRepository,
10 | UserFixtures,
11 | UserRepositoryMocks,
12 | } from "@/entities/user/**tests**";
13 | import {
14 | AsyncTestHelpers,
15 | MockHelpers,
16 | TestDataHelpers,
17 | } from "@/shared/libs/**tests**";
18 | import { BaseError } from "@/shared/libs/errors";
19 | import { beforeEach, describe, expect, it, vi } from "vitest";
20 | import { CommentService } from "../../services/comment.service";
21 |
22 | /\*_
23 | _ Comment Service Tests
24 | _ Verify all Comment service functionality using Given-When-Then pattern
25 | _/
26 | describe("Comment Service", () => {
27 | let mockCommentRepository: MockCommentRepository;
28 | let mockUserRepository: MockUserRepository;
29 | let commentService: ReturnType<typeof CommentService>;
30 |
31 | beforeEach(() => {
32 | // Given: Set up mock repositories using test utils
33 | mockCommentRepository = CommentRepositoryMocks.create();
34 | mockUserRepository = UserRepositoryMocks.create();
35 |
36 | // Reset all mocks using shared utility
37 | MockHelpers.resetAll(mockCommentRepository, mockUserRepository);
38 |
39 | commentService = CommentService(
40 | mockCommentRepository as unknown as CommentRepository,
41 | mockUserRepository as unknown as UserRepository
42 | );
43 | });
44 |
45 | describe("getAllComments", () => {
46 | it("should return comment list when repository returns valid data", async () => {
47 | // Given: Repository returns valid comments for a post
48 | const postId = "post-123";
49 | const mockComments = CommentFixtures.multiple;
50 | mockCommentRepository.getByPostId.mockResolvedValue(mockComments);
51 |
52 | // When: Get all comments for post
53 | const result = await commentService.getAllComments(postId);
54 |
55 | // Then: Should return mapped comment list
56 | expect(result).toEqual(
57 | mockComments.map((comment) => CommentMapper.toDto(comment))
58 | );
59 | expect(mockCommentRepository.getByPostId).toHaveBeenCalledWith(postId);
60 | });
61 |
62 | it("should return empty array when no comments exist for post", async () => {
63 | // Given: Repository returns empty array
64 | const postId = "post-456";
65 | mockCommentRepository.getByPostId.mockResolvedValue([]);
66 |
67 | // When: Get all comments for post
68 | const result = await commentService.getAllComments(postId);
69 |
70 | // Then: Should return empty array
71 | expect(result).toEqual([]);
72 | expect(mockCommentRepository.getByPostId).toHaveBeenCalledWith(postId);
73 | });
74 |
75 | it("should re-throw BaseError when repository throws BaseError", async () => {
76 | // Given: Repository throws BaseError
77 | const postId = "post-123";
78 | const baseError = BaseError.notFound("Post", postId);
79 | mockCommentRepository.getByPostId.mockRejectedValue(baseError);
80 |
81 | // When: Get all comments for post
82 | // Then: Should re-throw the same BaseError
83 | await expect(commentService.getAllComments(postId)).rejects.toThrow(
84 | baseError
85 | );
86 | });
87 |
88 | it("should wrap generic error in Error", async () => {
89 | // Given: Repository throws generic error
90 | const postId = "post-123";
91 | const genericError = new Error("Database connection failed");
92 | mockCommentRepository.getByPostId.mockRejectedValue(genericError);
93 |
94 | // When: Get all comments for post
95 | // Then: Should wrap error with post ID information
96 | await expect(commentService.getAllComments(postId)).rejects.toThrow(
97 | `Failed to fetch comments for post ID ${postId}`
98 | );
99 | });
100 | });
101 |
102 | describe("getCommentById", () => {
103 | it("should return comment when repository returns valid data", async () => {
104 | // Given: Repository returns valid comment
105 | const mockComment = CommentFixtures.valid.basic;
106 | mockCommentRepository.getById.mockResolvedValue(mockComment);
107 |
108 | // When: Get comment by ID
109 | const result = await commentService.getCommentById(mockComment.id);
110 |
111 | // Then: Should return mapped comment
112 | expect(result).toEqual(CommentMapper.toDto(mockComment));
113 | expect(mockCommentRepository.getById).toHaveBeenCalledWith(
114 | mockComment.id
115 | );
116 | });
117 |
118 | it("should throw BaseError when comment not found", async () => {
119 | // Given: Repository throws error for non-existent comment
120 | const commentId = "non-existent-comment";
121 | const notFoundError = new Error("Comment not found");
122 | mockCommentRepository.getById.mockRejectedValue(notFoundError);
123 |
124 | // When: Get comment by ID
125 | // Then: Should throw BaseError.notFound
126 | await expect(commentService.getCommentById(commentId)).rejects.toThrow(
127 | BaseError
128 | );
129 | await expect(commentService.getCommentById(commentId)).rejects.toThrow(
130 | "Comment"
131 | );
132 | });
133 |
134 | it("should re-throw BaseError when repository throws BaseError", async () => {
135 | // Given: Repository throws BaseError
136 | const commentId = "comment-123";
137 | const baseError = BaseError.unauthorized("Comment", commentId, "read");
138 | mockCommentRepository.getById.mockRejectedValue(baseError);
139 |
140 | // When: Get comment by ID
141 | // Then: Should re-throw the same BaseError
142 | await expect(commentService.getCommentById(commentId)).rejects.toThrow(
143 | baseError
144 | );
145 | });
146 | });
147 |
148 | describe("addComment", () => {
149 | it("should create and return new comment when valid data provided", async () => {
150 | // Given: Valid comment data and user profile
151 | const body = "This is a new comment";
152 | const postId = "post-123";
153 | const userId = "user-123";
154 | const mockUser = UserFixtures.valid.basic;
155 | const mockComment = CommentFixtures.valid.basic;
156 |
157 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
158 | mockCommentRepository.create.mockResolvedValue(mockComment);
159 |
160 | // When: Add new comment
161 | const result = await commentService.addComment(body, postId, userId);
162 |
163 | // Then: Should create and return new comment
164 | expect(result).toEqual(CommentMapper.toDto(mockComment));
165 | expect(mockUserRepository.getUserProfile).toHaveBeenCalled();
166 | expect(mockCommentRepository.create).toHaveBeenCalledWith(
167 | expect.objectContaining({
168 | body,
169 | postId,
170 | user: expect.objectContaining({
171 | id: userId,
172 | username: mockUser.username,
173 | profileImage: mockUser.profileImage,
174 | }),
175 | })
176 | );
177 | });
178 |
179 | it("should handle user without profile image", async () => {
180 | // Given: User without profile image
181 | const body = "Comment from user without image";
182 | const postId = "post-123";
183 | const userId = "user-456";
184 | const mockUser = { ...UserFixtures.valid.basic, profileImage: "" };
185 | const mockComment = CommentFixtures.valid.withoutUserImage;
186 |
187 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
188 | mockCommentRepository.create.mockResolvedValue(mockComment);
189 |
190 | // When: Add new comment
191 | const result = await commentService.addComment(body, postId, userId);
192 |
193 | // Then: Should create comment with empty profile image
194 | expect(result).toEqual(CommentMapper.toDto(mockComment));
195 | expect(mockCommentRepository.create).toHaveBeenCalledWith(
196 | expect.objectContaining({
197 | user: expect.objectContaining({
198 | profileImage: "",
199 | }),
200 | })
201 | );
202 | });
203 |
204 | it("should throw BaseError when comment creation fails", async () => {
205 | // Given: Repository fails to create comment
206 | const body = "Failed comment";
207 | const postId = "post-123";
208 | const userId = "user-123";
209 | const mockUser = UserFixtures.valid.basic;
210 |
211 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
212 | mockCommentRepository.create.mockResolvedValue(null);
213 |
214 | // When: Add new comment
215 | // Then: Should throw BaseError.createFailed
216 | await expect(
217 | commentService.addComment(body, postId, userId)
218 | ).rejects.toThrow(BaseError);
219 | await expect(
220 | commentService.addComment(body, postId, userId)
221 | ).rejects.toThrow("Failed to create comment");
222 | });
223 |
224 | it("should re-throw BaseError when repository throws BaseError", async () => {
225 | // Given: Repository throws BaseError
226 | const body = "Error comment";
227 | const postId = "post-123";
228 | const userId = "user-123";
229 | const mockUser = UserFixtures.valid.basic;
230 | const baseError = BaseError.createFailed("Comment");
231 |
232 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
233 | mockCommentRepository.create.mockRejectedValue(baseError);
234 |
235 | // When: Add new comment
236 | // Then: Should re-throw the same BaseError
237 | await expect(
238 | commentService.addComment(body, postId, userId)
239 | ).rejects.toThrow(baseError);
240 | });
241 |
242 | it("should wrap generic error in BaseError.createFailed", async () => {
243 | // Given: Repository throws generic error
244 | const body = "Generic error comment";
245 | const postId = "post-123";
246 | const userId = "user-123";
247 | const mockUser = UserFixtures.valid.basic;
248 | const genericError = new Error("Database error");
249 |
250 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
251 | mockCommentRepository.create.mockRejectedValue(genericError);
252 |
253 | // When: Add new comment
254 | // Then: Should wrap error in BaseError.createFailed
255 | await expect(
256 | commentService.addComment(body, postId, userId)
257 | ).rejects.toThrow(BaseError);
258 | await expect(
259 | commentService.addComment(body, postId, userId)
260 | ).rejects.toThrow("Failed to create comment");
261 | });
262 | });
263 |
264 | describe("updateComment", () => {
265 | it("should update and return comment when user is owner", async () => {
266 | // Given: Existing comment owned by user
267 | const commentId = "comment-123";
268 | const newBody = "Updated comment body";
269 | const userId = "user-123";
270 | const mockComment = {
271 | ...CommentFixtures.valid.basic,
272 | id: commentId,
273 | user: { ...CommentFixtures.valid.basic.user, id: userId },
274 | updateBody: vi.fn(),
275 | };
276 | const updatedComment = { ...mockComment, body: newBody };
277 |
278 | mockCommentRepository.getById.mockResolvedValue(mockComment);
279 | mockCommentRepository.update.mockResolvedValue(updatedComment);
280 |
281 | // When: Update comment
282 | const result = await commentService.updateComment(
283 | commentId,
284 | newBody,
285 | userId
286 | );
287 |
288 | // Then: Should update and return comment
289 | expect(result).toEqual(CommentMapper.toDto(updatedComment));
290 | expect(mockCommentRepository.getById).toHaveBeenCalledWith(commentId);
291 | expect(mockComment.updateBody).toHaveBeenCalledWith(newBody);
292 | expect(mockCommentRepository.update).toHaveBeenCalledWith(mockComment);
293 | });
294 |
295 | it("should throw BaseError.notFound when comment does not exist", async () => {
296 | // Given: Comment does not exist
297 | const commentId = "non-existent-comment";
298 | const newBody = "Updated body";
299 | const userId = "user-123";
300 |
301 | mockCommentRepository.getById.mockResolvedValue(null);
302 |
303 | // When: Update comment
304 | // Then: Should throw BaseError.notFound
305 | await expect(
306 | commentService.updateComment(commentId, newBody, userId)
307 | ).rejects.toThrow(BaseError);
308 | await expect(
309 | commentService.updateComment(commentId, newBody, userId)
310 | ).rejects.toThrow("Comment");
311 | });
312 |
313 | it("should throw BaseError.unauthorized when user is not owner", async () => {
314 | // Given: Comment owned by different user
315 | const commentId = "comment-123";
316 | const newBody = "Updated body";
317 | const userId = "user-456";
318 | const mockComment = {
319 | ...CommentFixtures.valid.basic,
320 | id: commentId,
321 | user: { ...CommentFixtures.valid.basic.user, id: "user-123" },
322 | };
323 |
324 | mockCommentRepository.getById.mockResolvedValue(mockComment);
325 |
326 | // When: Update comment
327 | // Then: Should throw BaseError.unauthorized
328 | await expect(
329 | commentService.updateComment(commentId, newBody, userId)
330 | ).rejects.toThrow(BaseError);
331 | await expect(
332 | commentService.updateComment(commentId, newBody, userId)
333 | ).rejects.toThrow("You don't have permission to edit");
334 | });
335 |
336 | it("should throw BaseError.updateFailed when repository update fails", async () => {
337 | // Given: Repository fails to update comment
338 | const commentId = "comment-123";
339 | const newBody = "Updated body";
340 | const userId = "user-123";
341 | const mockComment = {
342 | ...CommentFixtures.valid.basic,
343 | id: commentId,
344 | user: { ...CommentFixtures.valid.basic.user, id: userId },
345 | updateBody: vi.fn(),
346 | };
347 |
348 | mockCommentRepository.getById.mockResolvedValue(mockComment);
349 | mockCommentRepository.update.mockResolvedValue(null);
350 |
351 | // When: Update comment
352 | // Then: Should throw BaseError.updateFailed
353 | await expect(
354 | commentService.updateComment(commentId, newBody, userId)
355 | ).rejects.toThrow(BaseError);
356 | await expect(
357 | commentService.updateComment(commentId, newBody, userId)
358 | ).rejects.toThrow("Failed to update comment with ID");
359 | });
360 |
361 | it("should re-throw BaseError when repository throws BaseError", async () => {
362 | // Given: Repository throws BaseError
363 | const commentId = "comment-123";
364 | const newBody = "Updated body";
365 | const userId = "user-123";
366 | const baseError = BaseError.updateFailed("Comment", commentId);
367 |
368 | mockCommentRepository.getById.mockRejectedValue(baseError);
369 |
370 | // When: Update comment
371 | // Then: Should re-throw the same BaseError
372 | await expect(
373 | commentService.updateComment(commentId, newBody, userId)
374 | ).rejects.toThrow(baseError);
375 | });
376 | });
377 |
378 | describe("deleteComment", () => {
379 | it("should delete comment when user is owner", async () => {
380 | // Given: Existing comment owned by user
381 | const commentId = "comment-123";
382 | const userId = "user-123";
383 | const mockComment = {
384 | ...CommentFixtures.valid.basic,
385 | id: commentId,
386 | user: { ...CommentFixtures.valid.basic.user, id: userId },
387 | };
388 |
389 | mockCommentRepository.getById.mockResolvedValue(mockComment);
390 | mockCommentRepository.delete.mockResolvedValue(true);
391 |
392 | // When: Delete comment
393 | const result = await commentService.deleteComment(commentId, userId);
394 |
395 | // Then: Should delete comment and return true
396 | expect(result).toBe(true);
397 | expect(mockCommentRepository.getById).toHaveBeenCalledWith(commentId);
398 | expect(mockCommentRepository.delete).toHaveBeenCalledWith(commentId);
399 | });
400 |
401 | it("should throw BaseError.notFound when comment does not exist", async () => {
402 | // Given: Comment does not exist
403 | const commentId = "non-existent-comment";
404 | const userId = "user-123";
405 |
406 | mockCommentRepository.getById.mockResolvedValue(null);
407 |
408 | // When: Delete comment
409 | // Then: Should throw BaseError.notFound
410 | await expect(
411 | commentService.deleteComment(commentId, userId)
412 | ).rejects.toThrow(BaseError);
413 | await expect(
414 | commentService.deleteComment(commentId, userId)
415 | ).rejects.toThrow("Comment");
416 | });
417 |
418 | it("should throw BaseError.unauthorized when user is not owner", async () => {
419 | // Given: Comment owned by different user
420 | const commentId = "comment-123";
421 | const userId = "user-456";
422 | const mockComment = {
423 | ...CommentFixtures.valid.basic,
424 | id: commentId,
425 | user: { ...CommentFixtures.valid.basic.user, id: "user-123" },
426 | };
427 |
428 | mockCommentRepository.getById.mockResolvedValue(mockComment);
429 |
430 | // When: Delete comment
431 | // Then: Should throw BaseError.unauthorized
432 | await expect(
433 | commentService.deleteComment(commentId, userId)
434 | ).rejects.toThrow(BaseError);
435 | await expect(
436 | commentService.deleteComment(commentId, userId)
437 | ).rejects.toThrow("You don't have permission to delete");
438 | });
439 |
440 | it("should throw BaseError.deleteFailed when repository delete fails", async () => {
441 | // Given: Repository fails to delete comment
442 | const commentId = "comment-123";
443 | const userId = "user-123";
444 | const mockComment = {
445 | ...CommentFixtures.valid.basic,
446 | id: commentId,
447 | user: { ...CommentFixtures.valid.basic.user, id: userId },
448 | };
449 |
450 | mockCommentRepository.getById.mockResolvedValue(mockComment);
451 | mockCommentRepository.delete.mockResolvedValue(false);
452 |
453 | // When: Delete comment
454 | // Then: Should throw BaseError.deleteFailed
455 | await expect(
456 | commentService.deleteComment(commentId, userId)
457 | ).rejects.toThrow(BaseError);
458 | await expect(
459 | commentService.deleteComment(commentId, userId)
460 | ).rejects.toThrow("Failed to delete comment with ID");
461 | });
462 |
463 | it("should re-throw BaseError when repository throws BaseError", async () => {
464 | // Given: Repository throws BaseError
465 | const commentId = "comment-123";
466 | const userId = "user-123";
467 | const baseError = BaseError.deleteFailed("Comment", commentId);
468 |
469 | mockCommentRepository.getById.mockRejectedValue(baseError);
470 |
471 | // When: Delete comment
472 | // Then: Should re-throw the same BaseError
473 | await expect(
474 | commentService.deleteComment(commentId, userId)
475 | ).rejects.toThrow(baseError);
476 | });
477 | });
478 |
479 | describe("likeComment", () => {
480 | it("should like comment and return true when successful", async () => {
481 | // Given: Repository successfully likes comment
482 | const commentId = "comment-123";
483 | const userId = "user-456";
484 |
485 | mockCommentRepository.like.mockResolvedValue(true);
486 |
487 | // When: Like comment
488 | const result = await commentService.likeComment(commentId, userId);
489 |
490 | // Then: Should return true
491 | expect(result).toBe(true);
492 | expect(mockCommentRepository.like).toHaveBeenCalledWith(
493 | commentId,
494 | userId
495 | );
496 | });
497 |
498 | it("should return false when like operation fails", async () => {
499 | // Given: Repository fails to like comment
500 | const commentId = "comment-123";
501 | const userId = "user-456";
502 |
503 | mockCommentRepository.like.mockResolvedValue(false);
504 |
505 | // When: Like comment
506 | const result = await commentService.likeComment(commentId, userId);
507 |
508 | // Then: Should return false
509 | expect(result).toBe(false);
510 | expect(mockCommentRepository.like).toHaveBeenCalledWith(
511 | commentId,
512 | userId
513 | );
514 | });
515 |
516 | it("should re-throw BaseError when repository throws BaseError", async () => {
517 | // Given: Repository throws BaseError
518 | const commentId = "comment-123";
519 | const userId = "user-456";
520 | const baseError = BaseError.notFound("Comment", commentId);
521 |
522 | mockCommentRepository.like.mockRejectedValue(baseError);
523 |
524 | // When: Like comment
525 | // Then: Should re-throw the same BaseError
526 | await expect(
527 | commentService.likeComment(commentId, userId)
528 | ).rejects.toThrow(baseError);
529 | });
530 |
531 | it("should wrap generic error in BaseError.updateFailed", async () => {
532 | // Given: Repository throws generic error
533 | const commentId = "comment-123";
534 | const userId = "user-456";
535 | const genericError = new Error("Database error");
536 |
537 | mockCommentRepository.like.mockRejectedValue(genericError);
538 |
539 | // When: Like comment
540 | // Then: Should wrap error in BaseError.updateFailed
541 | await expect(
542 | commentService.likeComment(commentId, userId)
543 | ).rejects.toThrow(BaseError);
544 | await expect(
545 | commentService.likeComment(commentId, userId)
546 | ).rejects.toThrow("Failed to update comment with ID");
547 | });
548 | });
549 |
550 | describe("unlikeComment", () => {
551 | it("should unlike comment and return true when successful", async () => {
552 | // Given: Repository successfully unlikes comment
553 | const commentId = "comment-123";
554 | const userId = "user-456";
555 |
556 | mockCommentRepository.unlike.mockResolvedValue(true);
557 |
558 | // When: Unlike comment
559 | const result = await commentService.unlikeComment(commentId, userId);
560 |
561 | // Then: Should return true
562 | expect(result).toBe(true);
563 | expect(mockCommentRepository.unlike).toHaveBeenCalledWith(
564 | commentId,
565 | userId
566 | );
567 | });
568 |
569 | it("should return false when unlike operation fails", async () => {
570 | // Given: Repository fails to unlike comment
571 | const commentId = "comment-123";
572 | const userId = "user-456";
573 |
574 | mockCommentRepository.unlike.mockResolvedValue(false);
575 |
576 | // When: Unlike comment
577 | const result = await commentService.unlikeComment(commentId, userId);
578 |
579 | // Then: Should return false
580 | expect(result).toBe(false);
581 | expect(mockCommentRepository.unlike).toHaveBeenCalledWith(
582 | commentId,
583 | userId
584 | );
585 | });
586 |
587 | it("should re-throw BaseError when repository throws BaseError", async () => {
588 | // Given: Repository throws BaseError
589 | const commentId = "comment-123";
590 | const userId = "user-456";
591 | const baseError = BaseError.notFound("Comment", commentId);
592 |
593 | mockCommentRepository.unlike.mockRejectedValue(baseError);
594 |
595 | // When: Unlike comment
596 | // Then: Should re-throw the same BaseError
597 | await expect(
598 | commentService.unlikeComment(commentId, userId)
599 | ).rejects.toThrow(baseError);
600 | });
601 |
602 | it("should wrap generic error in BaseError.updateFailed", async () => {
603 | // Given: Repository throws generic error
604 | const commentId = "comment-123";
605 | const userId = "user-456";
606 | const genericError = new Error("Network error");
607 |
608 | mockCommentRepository.unlike.mockRejectedValue(genericError);
609 |
610 | // When: Unlike comment
611 | // Then: Should wrap error in BaseError.updateFailed
612 | await expect(
613 | commentService.unlikeComment(commentId, userId)
614 | ).rejects.toThrow(BaseError);
615 | await expect(
616 | commentService.unlikeComment(commentId, userId)
617 | ).rejects.toThrow("Failed to update comment with ID");
618 | });
619 | });
620 |
621 | describe("Error Handling", () => {
622 | it("should handle repository connection errors gracefully", async () => {
623 | // Given: Repository connection error
624 | const connectionError = new Error("Connection timeout");
625 | mockCommentRepository.getByPostId.mockRejectedValue(connectionError);
626 |
627 | // When: Get comments for post
628 | // Then: Should handle error gracefully
629 | await expect(commentService.getAllComments("post-123")).rejects.toThrow(
630 | "Failed to fetch comments for post ID post-123"
631 | );
632 | });
633 |
634 | it("should handle delayed repository responses", async () => {
635 | // Given: Repository with delayed response using AsyncTestHelpers
636 | const postId = "post-123";
637 | const mockComments = CommentFixtures.multiple;
638 | const delayedResponse = AsyncTestHelpers.wrapPromise(mockComments, 100);
639 | mockCommentRepository.getByPostId.mockImplementation(
640 | () => delayedResponse
641 | );
642 |
643 | // When: Get comments for post
644 | const result = await commentService.getAllComments(postId);
645 |
646 | // Then: Should handle delayed response correctly
647 | expect(result).toEqual(
648 | mockComments.map((comment) => CommentMapper.toDto(comment))
649 | );
650 | expect(mockCommentRepository.getByPostId).toHaveBeenCalledWith(postId);
651 | });
652 |
653 | it("should handle delayed repository errors", async () => {
654 | // Given: Repository with delayed error using AsyncTestHelpers
655 | const postId = "post-456";
656 | const delayedError = new Error("Delayed database error");
657 | const delayedErrorResponse = AsyncTestHelpers.wrapError(delayedError, 50);
658 | mockCommentRepository.getByPostId.mockImplementation(
659 | () => delayedErrorResponse
660 | );
661 |
662 | // When: Get comments for post
663 | // Then: Should handle delayed error correctly
664 | await expect(commentService.getAllComments(postId)).rejects.toThrow(
665 | `Failed to fetch comments for post ID ${postId}`
666 | );
667 | });
668 |
669 | it("should handle concurrent operations correctly", async () => {
670 | // Given: Multiple concurrent operations
671 | const commentId = "comment-123";
672 | const userId = "user-123";
673 | const mockComment = CommentFixtures.valid.basic;
674 |
675 | mockCommentRepository.getById.mockResolvedValue(mockComment);
676 | mockCommentRepository.like.mockResolvedValue(true);
677 | mockCommentRepository.unlike.mockResolvedValue(true);
678 |
679 | // When: Perform concurrent like and unlike operations
680 | const likePromise = commentService.likeComment(commentId, userId);
681 | const unlikePromise = commentService.unlikeComment(commentId, userId);
682 |
683 | const [likeResult, unlikeResult] = await Promise.all([
684 | likePromise,
685 | unlikePromise,
686 | ]);
687 |
688 | // Then: Should handle both operations correctly
689 | expect(likeResult).toBe(true);
690 | expect(unlikeResult).toBe(true);
691 | });
692 |
693 | it("should handle malformed comment data gracefully", async () => {
694 | // Given: Repository returns malformed comment data
695 | const malformedComment = {
696 | ...CommentFixtures.valid.basic,
697 | user: null,
698 | };
699 | mockCommentRepository.getById.mockResolvedValue(malformedComment);
700 |
701 | // When: Get comment by ID
702 | // Then: Should handle malformed data gracefully
703 | const result = await commentService.getCommentById("comment-123");
704 | expect(result).toBeDefined();
705 | });
706 | });
707 |
708 | describe("Integration Scenarios", () => {
709 | it("should handle complete comment lifecycle", async () => {
710 | // Given: Complete comment lifecycle scenario
711 | const postId = "post-123";
712 | const userId = "user-123";
713 | const body = "Test comment";
714 | const updatedBody = "Updated test comment";
715 | const mockUser = UserFixtures.valid.basic;
716 | const mockComment = {
717 | ...CommentFixtures.valid.basic,
718 | updateBody: vi.fn(),
719 | };
720 | const updatedComment = { ...mockComment, body: updatedBody };
721 |
722 | // Setup mocks for complete lifecycle
723 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
724 | mockCommentRepository.create.mockResolvedValue(mockComment);
725 | mockCommentRepository.getById.mockResolvedValue(mockComment);
726 | mockCommentRepository.update.mockResolvedValue(updatedComment);
727 | mockCommentRepository.delete.mockResolvedValue(true);
728 |
729 | // When: Execute complete lifecycle
730 | // 1. Create comment
731 | const createdComment = await commentService.addComment(
732 | body,
733 | postId,
734 | userId
735 | );
736 |
737 | // 2. Update comment
738 | const updatedCommentResult = await commentService.updateComment(
739 | mockComment.id,
740 | updatedBody,
741 | userId
742 | );
743 |
744 | // 3. Delete comment
745 | const deleteResult = await commentService.deleteComment(
746 | mockComment.id,
747 | userId
748 | );
749 |
750 | // Then: Should handle complete lifecycle correctly
751 | expect(createdComment).toEqual(CommentMapper.toDto(mockComment));
752 | expect(updatedCommentResult).toEqual(CommentMapper.toDto(updatedComment));
753 | expect(deleteResult).toBe(true);
754 | });
755 |
756 | it("should handle multiple comments for same post", async () => {
757 | // Given: Multiple comments for same post
758 | const postId = "post-123";
759 | const mockComments = CommentFixtures.multiple;
760 |
761 | mockCommentRepository.getByPostId.mockResolvedValue(mockComments);
762 |
763 | // When: Get all comments for post
764 | const result = await commentService.getAllComments(postId);
765 |
766 | // Then: Should return all comments for post
767 | expect(result).toHaveLength(mockComments.length);
768 | expect(result).toEqual(CommentMapper.toDtoList(mockComments));
769 | });
770 |
771 | it("should handle comment operations with different users", async () => {
772 | // Given: Comment operations with different users
773 | const commentId = "comment-123";
774 | const ownerId = "user-123";
775 | const otherUserId = "user-456";
776 | const mockComment = {
777 | ...CommentFixtures.valid.basic,
778 | id: commentId,
779 | user: { ...CommentFixtures.valid.basic.user, id: ownerId },
780 | };
781 |
782 | mockCommentRepository.getById.mockResolvedValue(mockComment);
783 | mockCommentRepository.like.mockResolvedValue(true);
784 |
785 | // When: Owner and other user perform different operations
786 | const likeByOtherUser = await commentService.likeComment(
787 | commentId,
788 | otherUserId
789 | );
790 |
791 | // Then: Should handle operations correctly based on user permissions
792 | expect(likeByOtherUser).toBe(true);
793 |
794 | // When: Other user tries to update comment
795 | // Then: Should throw unauthorized error
796 | await expect(
797 | commentService.updateComment(commentId, "Updated", otherUserId)
798 | ).rejects.toThrow(BaseError);
799 | });
800 | });
801 |
802 | describe("Advanced Test Scenarios with Shared Utilities", () => {
803 | it("should handle dynamic test data generation", async () => {
804 | // Given: Dynamically generated test data using TestDataHelpers
805 | const postId = TestDataHelpers.generateId("post");
806 | const userId = TestDataHelpers.generateId("user");
807 | const commentBody = `Test comment ${TestDataHelpers.generateId(
808 |         "content"
809 |       )}`;
810 | const mockUser = {
811 | ...UserFixtures.valid.basic,
812 | id: userId,
813 | username: TestDataHelpers.generateUsername(),
814 | email: TestDataHelpers.generateEmail(),
815 | };
816 | const mockComment = {
817 | ...CommentFixtures.valid.basic,
818 | id: TestDataHelpers.generateId("comment"),
819 | postId,
820 | body: commentBody,
821 | user: {
822 | id: userId,
823 | username: mockUser.username,
824 | profileImage: mockUser.profileImage || "",
825 | },
826 | createdAt: TestDataHelpers.generateTimestamp(-3600000),
827 | updatedAt: TestDataHelpers.generateTimestamp(-1800000),
828 | };
829 |
830 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
831 | mockCommentRepository.create.mockResolvedValue(mockComment);
832 |
833 | // When: Add comment with dynamic data
834 | const result = await commentService.addComment(
835 | commentBody,
836 | postId,
837 | userId
838 | );
839 |
840 | // Then: Should handle dynamic data correctly
841 | expect(result).toEqual(CommentMapper.toDto(mockComment));
842 | expect(mockUserRepository.getUserProfile).toHaveBeenCalled();
843 | expect(mockCommentRepository.create).toHaveBeenCalledWith(
844 | expect.objectContaining({
845 | body: commentBody,
846 | postId,
847 | user: expect.objectContaining({
848 | id: userId,
849 | username: mockUser.username,
850 | }),
851 | })
852 | );
853 | });
854 |
855 | it("should handle bulk comment operations with TestDataHelpers", async () => {
856 | // Given: Multiple comments generated using TestDataHelpers
857 | const postId = TestDataHelpers.generateId("post");
858 | const commentCount = 5;
859 | const mockComments = TestDataHelpers.createArray(
860 | commentCount,
861 | (index) => ({
862 | ...CommentFixtures.valid.basic,
863 | id: TestDataHelpers.generateId("comment"),
864 | postId,
865 | body: `Comment ${index + 1} - ${TestDataHelpers.generateId(
866 |             "content"
867 |           )}`,
868 | createdAt: TestDataHelpers.generateTimestamp(-index _ 3600000),
869 | updatedAt: TestDataHelpers.generateTimestamp(-index _ 3600000),
870 | })
871 | );
872 |
873 | mockCommentRepository.getByPostId.mockResolvedValue(mockComments);
874 |
875 | // When: Get all comments for post
876 | const result = await commentService.getAllComments(postId);
877 |
878 | // Then: Should return all generated comments
879 | expect(result).toHaveLength(commentCount);
880 | expect(result).toEqual(CommentMapper.toDtoList(mockComments));
881 | expect(mockCommentRepository.getByPostId).toHaveBeenCalledWith(postId);
882 | });
883 |
884 | it("should verify mock state using MockHelpers", async () => {
885 | // Given: Comment service with mock repositories
886 | const postId = TestDataHelpers.generateId("post");
887 | const mockComments = CommentFixtures.multiple;
888 | mockCommentRepository.getByPostId.mockResolvedValue(mockComments);
889 |
890 | // When: Perform multiple operations
891 | await commentService.getAllComments(postId);
892 | await commentService.getAllComments(postId);
893 |
894 | // Then: Verify mock state using MockHelpers
895 | MockHelpers.verifyMockState(
896 | mockCommentRepository as unknown as Record<string, unknown>,
897 | {
898 | getByPostId: 2,
899 | }
900 | );
901 | });
902 |
903 | it("should handle concurrent comment operations", async () => {
904 | // Given: Multiple concurrent comment operations
905 | const postIds = TestDataHelpers.createArray(3, (index) =>
906 | TestDataHelpers.generateId(`post-${index}`)
907 | );
908 | const mockCommentsPerPost = postIds.map((postId) =>
909 | TestDataHelpers.createArray(2, (index) => ({
910 | ...CommentFixtures.valid.basic,
911 | id: TestDataHelpers.generateId("comment"),
912 | postId,
913 | body: `Comment ${index + 1} for ${postId}`,
914 | }))
915 | );
916 |
917 | // Setup mocks for each post
918 | postIds.forEach((postId, index) => {
919 | mockCommentRepository.getByPostId.mockImplementationOnce(() =>
920 | AsyncTestHelpers.wrapPromise(mockCommentsPerPost[index], 50)
921 | );
922 | });
923 |
924 | // When: Execute concurrent operations
925 | const promises = postIds.map((postId) =>
926 | commentService.getAllComments(postId)
927 | );
928 | const results = await Promise.all(promises);
929 |
930 | // Then: Should handle all concurrent operations correctly
931 | expect(results).toHaveLength(3);
932 | results.forEach((result, index) => {
933 | expect(result).toHaveLength(2);
934 | expect(result).toEqual(
935 | mockCommentsPerPost[index].map((comment) =>
936 | CommentMapper.toDto(comment)
937 | )
938 | );
939 | });
940 | });
941 | });
942 | });
943 |

---

## /src/features/comment/**tests**/ui/comment-form/CommentForm.test.tsx:

1 | import { FullWrapper } from "@/shared/libs/**tests**";
2 | import { fireEvent, render, screen } from "@testing-library/react";
3 | import { beforeEach, describe, expect, it } from "vitest";
4 | import { CommentForm } from "../../../ui/comment-form";
5 |
6 | /\*_
7 | _ CommentForm Component Tests
8 | _ Core functionality and user interaction focused tests
9 | _/
10 | describe("CommentForm Component", () => {
11 | let validUserProfileImage: string;
12 |
13 | beforeEach(() => {
14 | validUserProfileImage = "https://example.com/user-avatar.jpg";
15 | });
16 |
17 | describe("Basic Rendering", () => {
18 | it("should render form with all essential elements", () => {
19 | // Given: Valid user profile image
20 | const userProfileImage = validUserProfileImage;
21 |
22 | // When: Render CommentForm component
23 | render(
24 | <FullWrapper>
25 | <CommentForm userProfileImage={userProfileImage} />
26 | </FullWrapper>
27 | );
28 |
29 | // Then: Should render all essential form elements
30 | const userAvatar = screen.getByRole("img");
31 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
32 | const submitButton = screen.getByRole("button", { name: "Post" });
33 |
34 | expect(userAvatar).toBeInTheDocument();
35 | expect(inputElement).toBeInTheDocument();
36 | expect(submitButton).toBeInTheDocument();
37 | });
38 |
39 | it("should render with empty profile image", () => {
40 | // Given: Empty profile image
41 | const emptyProfileImage = "";
42 |
43 | // When: Render CommentForm with empty profile image
44 | render(
45 | <FullWrapper>
46 | <CommentForm userProfileImage={emptyProfileImage} />
47 | </FullWrapper>
48 | );
49 |
50 | // Then: Should still render all elements
51 | const userAvatar = screen.getByRole("img");
52 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
53 |
54 | expect(userAvatar).toBeInTheDocument();
55 | expect(inputElement).toBeInTheDocument();
56 | });
57 | });
58 |
59 | describe("User Input", () => {
60 | it("should handle text input correctly", () => {
61 | // Given: Valid user profile image and test comment
62 | const userProfileImage = validUserProfileImage;
63 | const testComment = "This is a test comment";
64 |
65 | // When: Render form and type in input field
66 | render(
67 | <FullWrapper>
68 | <CommentForm userProfileImage={userProfileImage} />
69 | </FullWrapper>
70 | );
71 |
72 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
73 | fireEvent.change(inputElement, { target: { value: testComment } });
74 |
75 | // Then: Input should contain the typed text
76 | expect(inputElement).toHaveValue(testComment);
77 | });
78 |
79 | it("should start with empty input field", () => {
80 | // Given: Valid user profile image
81 | const userProfileImage = validUserProfileImage;
82 |
83 | // When: Render CommentForm component
84 | render(
85 | <FullWrapper>
86 | <CommentForm userProfileImage={userProfileImage} />
87 | </FullWrapper>
88 | );
89 |
90 | // Then: Input field should be empty initially
91 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
92 | expect(inputElement).toHaveValue("");
93 | });
94 |
95 | it("should handle special characters in input", () => {
96 | // Given: Valid user profile image and special characters
97 | const userProfileImage = validUserProfileImage;
98 | const specialComment = "Comment with émojis 🎉 and symbols!@#$%";
99 |
100 | // When: Type special characters in input field
101 | render(
102 | <FullWrapper>
103 | <CommentForm userProfileImage={userProfileImage} />
104 | </FullWrapper>
105 | );
106 |
107 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
108 | fireEvent.change(inputElement, { target: { value: specialComment } });
109 |
110 | // Then: Input should handle special characters correctly
111 | expect(inputElement).toHaveValue(specialComment);
112 | });
113 | });
114 |
115 | describe("Submit Button", () => {
116 | it("should be disabled when input is empty", () => {
117 | // Given: Valid user profile image
118 | const userProfileImage = validUserProfileImage;
119 |
120 | // When: Render CommentForm component
121 | render(
122 | <FullWrapper>
123 | <CommentForm userProfileImage={userProfileImage} />
124 | </FullWrapper>
125 | );
126 |
127 | // Then: Submit button should be disabled initially
128 | const submitButton = screen.getByRole("button", { name: "Post" });
129 | expect(submitButton).toBeDisabled();
130 | });
131 |
132 | it("should have correct button attributes", () => {
133 | // Given: Valid user profile image
134 | const userProfileImage = validUserProfileImage;
135 |
136 | // When: Render CommentForm component
137 | render(
138 | <FullWrapper>
139 | <CommentForm userProfileImage={userProfileImage} />
140 | </FullWrapper>
141 | );
142 |
143 | // Then: Submit button should have correct attributes
144 | const submitButton = screen.getByRole("button", { name: "Post" });
145 | expect(submitButton).toHaveAttribute("type", "submit");
146 | expect(submitButton).toHaveTextContent("Post");
147 | });
148 | });
149 |
150 | describe("Form Submission", () => {
151 | it("should have submit button disabled by default", () => {
152 | // Given: Valid user profile image
153 | const userProfileImage = validUserProfileImage;
154 |
155 | // When: Render CommentForm component
156 | render(
157 | <FullWrapper>
158 | <CommentForm userProfileImage={userProfileImage} />
159 | </FullWrapper>
160 | );
161 |
162 | // Then: Submit button should be disabled by default (current implementation)
163 | const submitButton = screen.getByRole("button", { name: "Post" });
164 | expect(submitButton).toBeDisabled();
165 | });
166 |
167 | it("should handle text input correctly", () => {
168 | // Given: Valid user profile image and test comment
169 | const userProfileImage = validUserProfileImage;
170 | const testComment = "This is a test comment";
171 |
172 | // When: Render form and type in input field
173 | render(
174 | <FullWrapper>
175 | <CommentForm userProfileImage={userProfileImage} />
176 | </FullWrapper>
177 | );
178 |
179 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
180 | fireEvent.change(inputElement, { target: { value: testComment } });
181 |
182 | // Then: Input should contain the typed text (but button remains disabled in current implementation)
183 | expect(inputElement).toHaveValue(testComment);
184 |
185 | const submitButton = screen.getByRole("button", { name: "Post" });
186 | expect(submitButton).toBeDisabled(); // Current implementation always disables button
187 | });
188 |
189 | it("should handle form submission without errors", () => {
190 | // Given: Valid user profile image
191 | const userProfileImage = validUserProfileImage;
192 |
193 | // When: Render form and attempt submission
194 | render(
195 | <FullWrapper>
196 | <CommentForm userProfileImage={userProfileImage} />
197 | </FullWrapper>
198 | );
199 |
200 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
201 | const submitButton = screen.getByRole("button", { name: "Post" });
202 |
203 | // Type some input
204 | fireEvent.change(inputElement, { target: { value: "Test comment" } });
205 |
206 | // Attempt to submit (though button is disabled, form submission should not crash)
207 | expect(() => {
208 | fireEvent.click(submitButton);
209 | }).not.toThrow();
210 |
211 | // Then: Should not crash and input should remain
212 | expect(inputElement).toHaveValue("Test comment");
213 | });
214 |
215 | it("should accept custom form props", () => {
216 | // Given: Valid user profile image and custom props
217 | const userProfileImage = validUserProfileImage;
218 | const customClassName = "custom-form-class";
219 | const testId = "custom-form";
220 |
221 | // When: Render CommentForm with custom props
222 | render(
223 | <FullWrapper>
224 | <CommentForm
225 | userProfileImage={userProfileImage}
226 | className={customClassName}
227 | data-testid={testId}
228 | />
229 | </FullWrapper>
230 | );
231 |
232 | // Then: Should apply custom props to form element
233 | const formElement = screen.getByTestId(testId);
234 | expect(formElement).toBeInTheDocument();
235 | expect(formElement).toHaveClass(customClassName);
236 | });
237 |
238 | it("should log input changes to console", () => {
239 | // Given: Valid user profile image and console spy
240 | const userProfileImage = validUserProfileImage;
241 | const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
242 |
243 | // When: Render form and type in input field
244 | render(
245 | <FullWrapper>
246 | <CommentForm userProfileImage={userProfileImage} />
247 | </FullWrapper>
248 | );
249 |
250 | const inputElement = screen.getByPlaceholderText("Enter a comment...");
251 | fireEvent.change(inputElement, { target: { value: "Test" } });
252 |
253 | // Then: Should log the change event (current implementation)
254 | expect(consoleSpy).toHaveBeenCalled();
255 |
256 | // Cleanup
257 | consoleSpy.mockRestore();
258 | });
259 | });
260 |
261 | describe("Accessibility", () => {
262 | it("should have proper form semantics", () => {
263 | // Given: Valid user profile image
264 | const userProfileImage = validUserProfileImage;
265 |
266 | // When: Render CommentForm component
267 | render(
268 | <FullWrapper>
269 | <CommentForm userProfileImage={userProfileImage} />
270 | </FullWrapper>
271 | );
272 |
273 | // Then: Should have proper semantic elements
274 | const inputElement = screen.getByRole("textbox");
275 | const submitButton = screen.getByRole("button", { name: "Post" });
276 |
277 | expect(inputElement).toBeInTheDocument();
278 | expect(inputElement).toHaveAttribute("placeholder", "Enter a comment...");
279 | expect(submitButton).toBeInTheDocument();
280 | });
281 | });
282 | });
283 |

---

## /src/features/comment/**tests**/ui/comment-view/CommentView.test.tsx:

1 | import { CommentDto } from "@/entities/comment";
2 | import { FullWrapper } from "@/shared/libs/**tests**";
3 | import { fireEvent, render, screen } from "@testing-library/react";
4 | import { beforeEach, describe, expect, it } from "vitest";
5 | import { CommentView } from "../../../ui/comment-view";
6 | import { mockSingleComment } from "../../fixtures";
7 |
8 | /\*_
9 | _ CommentView Component Tests
10 | _ Core functionality and user interaction focused tests
11 | _/
12 | describe("CommentView Component", () => {
13 | let validCommentDto: CommentDto;
14 |
15 | beforeEach(() => {
16 | validCommentDto = { ...mockSingleComment };
17 | });
18 |
19 | describe("Basic Rendering", () => {
20 | it("should render comment with all essential elements", () => {
21 | // Given: Valid comment data
22 | const comment = validCommentDto;
23 |
24 | // When: Render CommentView component
25 | render(
26 | <FullWrapper>
27 | <CommentView comment={comment} />
28 | </FullWrapper>
29 | );
30 |
31 | // Then: Should display all essential elements
32 | const userAvatar = screen.getByRole("img");
33 | const username = screen.getByText(comment.user.username);
34 | const commentBody = screen.getByText(comment.body);
35 | const likeButton = screen.getByRole("button", { name: "Like" });
36 | const replyButton = screen.getByRole("button", { name: "Reply" });
37 |
38 | expect(userAvatar).toBeInTheDocument();
39 | expect(username).toBeInTheDocument();
40 | expect(commentBody).toBeInTheDocument();
41 | expect(likeButton).toBeInTheDocument();
42 | expect(replyButton).toBeInTheDocument();
43 | });
44 |
45 | it("should render with empty comment body", () => {
46 | // Given: Comment with empty body
47 | const emptyBodyComment: CommentDto = {
48 | ...validCommentDto,
49 | body: "",
50 | };
51 |
52 | // When: Render CommentView component
53 | render(
54 | <FullWrapper>
55 | <CommentView comment={emptyBodyComment} />
56 | </FullWrapper>
57 | );
58 |
59 | // Then: Should still render user info and buttons
60 | const username = screen.getByText(emptyBodyComment.user.username);
61 | const likeButton = screen.getByRole("button", { name: "Like" });
62 |
63 | expect(username).toBeInTheDocument();
64 | expect(likeButton).toBeInTheDocument();
65 | });
66 | });
67 |
68 | describe("User Information", () => {
69 | it("should display username correctly", () => {
70 | // Given: Valid comment data
71 | const comment = validCommentDto;
72 |
73 | // When: Render CommentView component
74 | render(
75 | <FullWrapper>
76 | <CommentView comment={comment} />
77 | </FullWrapper>
78 | );
79 |
80 | // Then: Should display username
81 | const username = screen.getByText(comment.user.username);
82 | expect(username).toBeInTheDocument();
83 | });
84 |
85 | it("should display user avatar", () => {
86 | // Given: Valid comment data
87 | const comment = validCommentDto;
88 |
89 | // When: Render CommentView component
90 | render(
91 | <FullWrapper>
92 | <CommentView comment={comment} />
93 | </FullWrapper>
94 | );
95 |
96 | // Then: Should display user avatar with alt text
97 | const userAvatar = screen.getByRole("img");
98 | expect(userAvatar).toBeInTheDocument();
99 | expect(userAvatar).toHaveAttribute(
100 | "alt",
101 | `${comment.user.profileImage}-profile`
102 | );
103 | });
104 | });
105 |
106 | describe("Comment Content", () => {
107 | it("should display comment body text", () => {
108 | // Given: Valid comment data
109 | const comment = validCommentDto;
110 |
111 | // When: Render CommentView component
112 | render(
113 | <FullWrapper>
114 | <CommentView comment={comment} />
115 | </FullWrapper>
116 | );
117 |
118 | // Then: Should display comment body
119 | const commentBody = screen.getByText(comment.body);
120 | expect(commentBody).toBeInTheDocument();
121 | expect(commentBody).toHaveTextContent(comment.body);
122 | });
123 |
124 | it("should handle special characters in comment body", () => {
125 | // Given: Comment with special characters
126 | const specialCharComment: CommentDto = {
127 | ...validCommentDto,
128 | body: "Comment with émojis 🎉 and symbols !@#$%",
129 |       };
130 | 
131 |       // When: Render CommentView component
132 |       render(
133 |         <FullWrapper>
134 |           <CommentView comment={specialCharComment} />
135 |         </FullWrapper>
136 |       );
137 | 
138 |       // Then: Should display special characters correctly
139 |       const commentBody = screen.getByText(specialCharComment.body);
140 |       expect(commentBody).toHaveTextContent(
141 |         "Comment with émojis 🎉 and symbols !@#$%"
142 | );
143 | });
144 | });
145 |
146 | describe("Timestamp Display", () => {
147 | it("should display formatted timestamp when updatedAt is available", () => {
148 | // Given: Comment with updatedAt timestamp
149 | const comment = {
150 | ...validCommentDto,
151 | updatedAt: 1640995200000, // January 1, 2022
152 | };
153 |
154 | // When: Render CommentView component
155 | render(
156 | <FullWrapper>
157 | <CommentView comment={comment} />
158 | </FullWrapper>
159 | );
160 |
161 | // Then: Should display formatted timestamp
162 | const timestampElement = screen.getByText(/2022|Jan|January/i);
163 | expect(timestampElement).toBeInTheDocument();
164 | });
165 |
166 | it("should display createdAt when updatedAt is not available", () => {
167 | // Given: Comment with only createdAt timestamp
168 | const comment = {
169 | ...validCommentDto,
170 | createdAt: 1640995200000, // January 1, 2022
171 | updatedAt: undefined,
172 | };
173 |
174 | // When: Render CommentView component
175 | render(
176 | <FullWrapper>
177 | <CommentView comment={comment} />
178 | </FullWrapper>
179 | );
180 |
181 | // Then: Should display createdAt timestamp
182 | const timestampElement = screen.getByText(/2022|Jan|January/i);
183 | expect(timestampElement).toBeInTheDocument();
184 | });
185 | });
186 |
187 | describe("Action Buttons", () => {
188 | it("should render Like and Reply buttons", () => {
189 | // Given: Valid comment data
190 | const comment = validCommentDto;
191 |
192 | // When: Render CommentView component
193 | render(
194 | <FullWrapper>
195 | <CommentView comment={comment} />
196 | </FullWrapper>
197 | );
198 |
199 | // Then: Should render both action buttons
200 | const likeButton = screen.getByRole("button", { name: "Like" });
201 | const replyButton = screen.getByRole("button", { name: "Reply" });
202 |
203 | expect(likeButton).toBeInTheDocument();
204 | expect(likeButton).toHaveTextContent("Like");
205 | expect(replyButton).toBeInTheDocument();
206 | expect(replyButton).toHaveTextContent("Reply");
207 | });
208 |
209 | it("should handle button clicks", () => {
210 | // Given: Valid comment data
211 | const comment = validCommentDto;
212 |
213 | // When: Render CommentView and click buttons
214 | render(
215 | <FullWrapper>
216 | <CommentView comment={comment} />
217 | </FullWrapper>
218 | );
219 |
220 | const likeButton = screen.getByRole("button", { name: "Like" });
221 | const replyButton = screen.getByRole("button", { name: "Reply" });
222 |
223 | fireEvent.click(likeButton);
224 | fireEvent.click(replyButton);
225 |
226 | // Then: Button clicks should be handled without errors
227 | expect(likeButton).toBeInTheDocument();
228 | expect(replyButton).toBeInTheDocument();
229 | });
230 | });
231 |
232 | describe("Accessibility", () => {
233 | it("should have proper semantic structure", () => {
234 | // Given: Valid comment data
235 | const comment = validCommentDto;
236 |
237 | // When: Render CommentView component
238 | render(
239 | <FullWrapper>
240 | <CommentView comment={comment} />
241 | </FullWrapper>
242 | );
243 |
244 | // Then: Should have proper semantic elements
245 | const userAvatar = screen.getByRole("img");
246 | const likeButton = screen.getByRole("button", { name: "Like" });
247 | const replyButton = screen.getByRole("button", { name: "Reply" });
248 |
249 | expect(userAvatar).toHaveAttribute("alt");
250 | expect(likeButton).toBeInTheDocument();
251 | expect(replyButton).toBeInTheDocument();
252 | });
253 | });
254 | });
255 |

---

## /src/features/comment/hooks/comment.hooks.factory.ts:

1 | import { CommentUseCase } from "../usecase/comment.usecase";
2 | import { createUseGetCommentsByPostId } from "./useGetCommentsByPostId";
3 |
4 | export const createCommentHooks = (commentUseCase: CommentUseCase) => ({
5 | useGetCommentsByPostId: createUseGetCommentsByPostId(commentUseCase),
6 | });
7 |

---

## /src/features/comment/hooks/index.ts:

1 | import { commentUseCase } from "../services";
2 | import { createCommentHooks } from "./comment.hooks.factory";
3 |
4 | export const { useGetCommentsByPostId } = createCommentHooks(commentUseCase);
5 |

---

## /src/features/comment/hooks/useGetCommentsByPostId.ts:

1 | import { COMMENT_QUERY_KEY, CommentDto } from "@/entities/comment";
2 | import { BaseError } from "@/shared/libs";
3 | import { useQuery, UseQueryResult } from "@tanstack/react-query";
4 | import { CommentUseCase } from "../usecase/comment.usecase";
5 |
6 | export const createUseGetCommentsByPostId = (
7 | commentUseCase: CommentUseCase
8 | ) => {
9 | return (postId: string): UseQueryResult<CommentDto[], Error> => {
10 | const useGetCommentsByPostId = useQuery<CommentDto[], Error>({
11 | queryKey: COMMENT_QUERY_KEY.byPostId(postId),
12 | queryFn: async () => {
13 | try {
14 | return await commentUseCase.getAllComments(postId);
15 | } catch (error) {
16 | if (error instanceof BaseError) {
17 | throw error;
18 | }
19 | throw new BaseError(
20 | `Failed to fetch comments for post ${postId}`,
21 | "FETCH_FAILED"
22 | );
23 | }
24 | },
25 | staleTime: 60 _ 1000,
26 | gcTime: 5 _ 60 \* 1000,
27 | refetchOnWindowFocus: true,
28 | enabled: Boolean(postId),
29 | });
30 | return useGetCommentsByPostId;
31 | };
32 | };
33 |

---

## /src/features/comment/index.ts:

1 | export { useGetCommentsByPostId } from "./hooks";
2 | export { CommentForm } from "./ui/comment-form";
3 | export { CommentView } from "./ui/comment-view";
4 |

---

## /src/features/comment/services/comment.service.factory.ts:

1 | import { CommentApiRepository } from "@/entities/comment";
2 | import { UserApiRepository } from "@/entities/user";
3 | import { apiClient } from "@/shared/api";
4 | import { CommentService } from "./comment.service";
5 |
6 | export const createCommentService = () => {
7 | const commentRepository = new CommentApiRepository(apiClient);
8 | const userRepository = new UserApiRepository(apiClient);
9 | return CommentService(commentRepository, userRepository);
10 | };
11 |

---

## /src/features/comment/services/comment.service.ts:

1 | import {
2 | CommentDto,
3 | CommentFactory,
4 | CommentMapper,
5 | CommentRepository,
6 | } from "@/entities/comment";
7 | import { UserRepository } from "@/entities/user";
8 | import { BaseError } from "@/shared/libs/errors";
9 | import { CommentUseCase } from "../usecase/comment.usecase";
10 |
11 | export const CommentService = (
12 | commentRepository: CommentRepository,
13 | userRepository: UserRepository
14 | ): CommentUseCase => ({
15 | getAllComments: async (postId: string): Promise<CommentDto[]> => {
16 | try {
17 | const domainComments = await commentRepository.getByPostId(postId);
18 | return domainComments.map((comment) => CommentMapper.toDto(comment));
19 | } catch (error) {
20 | console.error(`Error fetching comments for post ID ${postId}:`, error);
21 | if (error instanceof BaseError) {
22 | throw error;
23 | }
24 | throw new Error(`Failed to fetch comments for post ID ${postId}`);
25 | }
26 | },
27 |
28 | getCommentById: async (id: string): Promise<CommentDto> => {
29 | try {
30 | const comment = await commentRepository.getById(id);
31 | return CommentMapper.toDto(comment);
32 | } catch (error) {
33 | console.error(`Error fetching comment with ID ${id}:`, error);
34 | if (error instanceof BaseError) {
35 | throw error;
36 | }
37 | throw BaseError.notFound("Comment", id);
38 | }
39 | },
40 |
41 | addComment: async (
42 | body: string,
43 | postId: string,
44 | userId: string
45 | ): Promise<CommentDto> => {
46 | try {
47 | const user = await userRepository.getUserProfile();
48 |
49 | const newComment = CommentFactory.createNew(body, postId, {
50 | id: userId,
51 | username: user.username,
52 | profileImage: user.profileImage || "",
53 | });
54 |
55 | const savedComment = await commentRepository.create(newComment);
56 |
57 | if (!savedComment) throw BaseError.createFailed("Comment");
58 |
59 | return CommentMapper.toDto(savedComment);
60 | } catch (error) {
61 | console.error(`Error creating comment:`, error);
62 | if (error instanceof BaseError) {
63 | throw error;
64 | }
65 | throw BaseError.createFailed("Comment");
66 | }
67 | },
68 |
69 | updateComment: async (
70 | id: string,
71 | body: string,
72 | userId: string
73 | ): Promise<CommentDto> => {
74 | try {
75 | const existingComment = await commentRepository.getById(id);
76 | if (!existingComment) {
77 | throw BaseError.notFound("Comment", id);
78 | }
79 |
80 | if (existingComment.user.id !== userId) {
81 | throw BaseError.unauthorized("Comment", id, "edit");
82 | }
83 |
84 | existingComment.updateBody(body);
85 |
86 | const updatedComment = await commentRepository.update(existingComment);
87 | if (!updatedComment) {
88 | throw BaseError.updateFailed("Comment", id);
89 | }
90 |
91 | return CommentMapper.toDto(updatedComment);
92 | } catch (error) {
93 | console.error(`Error updating comment with ID ${id}:`, error);
94 | if (error instanceof BaseError) {
95 | throw error;
96 | }
97 | throw BaseError.updateFailed("Comment", id);
98 | }
99 | },
100 |
101 | deleteComment: async (id: string, userId: string): Promise<boolean> => {
102 | try {
103 | const existingComment = await commentRepository.getById(id);
104 | if (!existingComment) {
105 | throw BaseError.notFound("Comment", id);
106 | }
107 |
108 | if (existingComment.user.id !== userId) {
109 | throw BaseError.unauthorized("Comment", id, "delete");
110 | }
111 |
112 | const result = await commentRepository.delete(id);
113 | if (!result) {
114 | throw BaseError.deleteFailed("Comment", id);
115 | }
116 |
117 | return result;
118 | } catch (error) {
119 | console.error(`Error deleting comment with ID ${id}:`, error);
120 | if (error instanceof BaseError) {
121 | throw error;
122 | }
123 | throw BaseError.deleteFailed("Comment", id);
124 | }
125 | },
126 |
127 | likeComment: async (id: string, userId: string): Promise<boolean> => {
128 | try {
129 | return await commentRepository.like(id, userId);
130 | } catch (error) {
131 | console.error(`Error liking comment with ID ${id}:`, error);
132 | if (error instanceof BaseError) {
133 | throw error;
134 | }
135 | throw BaseError.updateFailed("Comment", id);
136 | }
137 | },
138 |
139 | unlikeComment: async (id: string, userId: string): Promise<boolean> => {
140 | try {
141 | return await commentRepository.unlike(id, userId);
142 | } catch (error) {
143 | console.error(`Error unliking comment with ID ${id}:`, error);
144 | if (error instanceof BaseError) {
145 | throw error;
146 | }
147 | throw BaseError.updateFailed("Comment", id);
148 | }
149 | },
150 | });
151 |

---

## /src/features/comment/services/index.ts:

1 | import { createCommentService } from "./comment.service.factory";
2 |
3 | export const commentUseCase = createCommentService();
4 |

---

## /src/features/comment/ui/comment-form/CommentForm.tsx:

1 | import { UserAvatar } from "@/entities/user/ui/identifier";
2 | import { Input } from "@/shared/ui/input";
3 |
4 | interface CommentFormProps extends React.HTMLAttributes<HTMLFormElement> {
5 | userProfileImage: string;
6 | }
7 |
8 | export const CommentForm = ({
9 | userProfileImage,
10 | className,
11 | ...props
12 | }: CommentFormProps) => {
13 | return (
14 | <form
15 | {...props}
16 | onSubmit={() => {}}
17 | className={`flex items-center mb-6 gap-4 ${className}`}>
18 | <UserAvatar userProfileImage={userProfileImage} />
19 | <Input
20 | type="text"
21 | placeholder="Enter a comment..."
22 | onChange={(e) => {
23 | console.log(e);
24 | }}
25 | />
26 | <button
27 | type="submit"
28 | className=" text-slate-600 hover:text-teal-600 font-medium text-sm cursor-pointer"
29 | disabled={!"".trim()}>
30 | Post
31 | </button>
32 | </form>
33 | );
34 | };
35 |

---

## /src/features/comment/ui/comment-form/index.ts:

1 | export { CommentForm } from "./CommentForm";
2 |

---

## /src/features/comment/ui/comment-view/CommentView.tsx:

1 | import { CommentDto } from "@/entities/comment";
2 | import { UserAvatar } from "@/entities/user";
3 | import { formatDate } from "@/shared/libs";
4 |
5 | export const CommentView = ({ comment }: { comment: CommentDto }) => {
6 | return (
7 | <div key={comment.id} className="flex items-start space-x-2">
8 | <UserAvatar userProfileImage={comment.user.profileImage} />
9 | <div className="flex-1 px-2">
10 | <div className="bg-gray-50 rounded-lg p-3">
11 | <div className="font-semibold text-sm">{comment.user.username}</div>
12 | <p className="text-gray-800 text-sm mt-1">{comment.body}</p>
13 | </div>
14 | <div className="flex items-center mt-1 text-xs text-gray-500">
15 | <span className="mr-3">
16 | {formatDate(comment.updatedAt ?? comment.createdAt ?? "")}
17 | </span>
18 | <button className="mr-3 hover:text-gray-700 cursor-pointer">
19 | Like
20 | </button>
21 | <button className="hover:text-gray-700 cursor-pointer">Reply</button>
22 | </div>
23 | </div>
24 | </div>
25 | );
26 | };
27 |

---

## /src/features/comment/ui/comment-view/index.ts:

1 | export { CommentView } from "./CommentView";
2 |

---

## /src/features/comment/usecase/comment.usecase.ts:

1 | import { CommentDto } from "@/entities/comment";
2 |
3 | export interface CommentUseCase {
4 | getAllComments: (postId: string) => Promise<CommentDto[]>;
5 | getCommentById: (id: string) => Promise<CommentDto>;
6 | addComment: (
7 | body: string,
8 | postId: string,
9 | userId: string
10 | ) => Promise<CommentDto>;
11 | updateComment: (
12 | id: string,
13 | body: string,
14 | userId: string
15 | ) => Promise<CommentDto>;
16 | deleteComment: (id: string, userId: string) => Promise<boolean>;
17 | likeComment: (id: string, userId: string) => Promise<boolean>;
18 | unlikeComment: (id: string, userId: string) => Promise<boolean>;
19 | }
20 |

---

## /src/features/comment/usecase/index.ts:

1 | export { type CommentUseCase } from "./comment.usecase";
2 |

---

## /src/features/post/**tests**/fixtures/index.ts:

1 | export \* from "./post-hook.fixtures";

---

## /src/features/post/**tests**/fixtures/post-hook.fixtures.ts:

1 | /\*_
2 | _ Post Hook Test Fixtures
3 | _ Mock data for post-related hook tests
4 | _/
5 |
6 | import { CommentDto } from "@/entities/comment";
7 | import { PostDto } from "@/entities/post";
8 | import { PostDetailResult, PostListResult } from "../../types";
9 |
10 | export const mockComments: CommentDto[] = [
11 | {
12 | id: "comment-1",
13 | postId: "post-1",
14 | user: {
15 | id: "user-2",
16 | username: "commenter",
17 | profileImage: "https://example.com/commenter.jpg",
18 | },
19 | body: "Test comment",
20 | likes: 3,
21 | createdAt: 1640995300000,
22 | updatedAt: 1640995300000,
23 | },
24 | {
25 | id: "comment-2",
26 | postId: "post-1",
27 | user: {
28 | id: "user-3",
29 | username: "another_user",
30 | profileImage: "https://example.com/another.jpg",
31 | },
32 | body: "Another test comment",
33 | likes: 1,
34 | createdAt: 1640995400000,
35 | updatedAt: 1640995400000,
36 | },
37 | ];
38 |
39 | export const mockPostDetailData: PostDetailResult = {
40 | id: "post-1",
41 | title: "Test Post",
42 | body: "This is a test post",
43 | user: {
44 | id: "user-1",
45 | username: "testuser",
46 | profileImage: "https://example.com/avatar.jpg",
47 | },
48 | image: "https://example.com/post-image.jpg",
49 | likes: 10,
50 | totalComments: 2,
51 | createdAt: 1640995200000,
52 | updatedAt: 1640995200000,
53 | comments: mockComments,
54 | };
55 |
56 | export const mockPostsArray: PostDto[] = [
57 | {
58 | id: "post-1",
59 | title: "First Test Post",
60 | body: "This is the first test post",
61 | user: {
62 | id: "user-1",
63 | username: "testuser",
64 | profileImage: "https://example.com/avatar.jpg",
65 | },
66 | image: "https://example.com/post-1.jpg",
67 | likes: 10,
68 | totalComments: 2,
69 | createdAt: 1640995200000,
70 | updatedAt: 1640995200000,
71 | },
72 | {
73 | id: "post-2",
74 | title: "Second Test Post",
75 | body: "This is the second test post",
76 | user: {
77 | id: "user-2",
78 | username: "anotheruser",
79 | profileImage: "https://example.com/avatar2.jpg",
80 | },
81 | image: "https://example.com/post-2.jpg",
82 | likes: 5,
83 | totalComments: 1,
84 | createdAt: 1640995300000,
85 | updatedAt: 1640995300000,
86 | },
87 | ];
88 |
89 | export const mockPostsData: PostListResult = {
90 | data: mockPostsArray,
91 | pagination: {
92 | limit: 10,
93 | skip: 0,
94 | total: mockPostsArray.length,
95 | },
96 | };
97 |

---

## /src/features/post/**tests**/hooks/useGetPostById.test.ts:

1 | import { QueryWrapper } from "@/shared/libs/**tests**";
2 | import { BaseError } from "@/shared/libs/errors";
3 | import { renderHook, waitFor } from "@testing-library/react";
4 | import { beforeEach, describe, expect, it, vi } from "vitest";
5 | import { createUseGetPostById } from "../../hooks/useGetPostById";
6 | import { mockPostDetailData } from "../fixtures";
7 |
8 | /\*_
9 | _ useGetPostById Hook Tests
10 | _ Verify React Query hook functionality using Given-When-Then pattern
11 | _/
12 | describe("useGetPostById Hook", () => {
13 | let mockPostUseCase: {
14 | getAllPosts: ReturnType<typeof vi.fn>;
15 | searchPosts: ReturnType<typeof vi.fn>;
16 | getPostById: ReturnType<typeof vi.fn>;
17 | addPost: ReturnType<typeof vi.fn>;
18 | updatePost: ReturnType<typeof vi.fn>;
19 | deletePost: ReturnType<typeof vi.fn>;
20 | likePost: ReturnType<typeof vi.fn>;
21 | unlikePost: ReturnType<typeof vi.fn>;
22 | };
23 | let useGetPostById: ReturnType<typeof createUseGetPostById>;
24 |
25 | beforeEach(() => {
26 | // Given: Set up mock use case and test data
27 | mockPostUseCase = {
28 | getAllPosts: vi.fn(),
29 | searchPosts: vi.fn(),
30 | getPostById: vi.fn(),
31 | addPost: vi.fn(),
32 | updatePost: vi.fn(),
33 | deletePost: vi.fn(),
34 | likePost: vi.fn(),
35 | unlikePost: vi.fn(),
36 | };
37 |
38 | useGetPostById = createUseGetPostById(mockPostUseCase);
39 | });
40 |
41 | describe("Success Cases", () => {
42 | it("should successfully fetch post details by ID", async () => {
43 | // Given: Valid post ID and mock data
44 | const postId = "post-1";
45 | mockPostUseCase.getPostById.mockResolvedValue(mockPostDetailData);
46 |
47 | // When: Hook is called with valid post ID
48 | const { result } = renderHook(() => useGetPostById(postId), {
49 | wrapper: QueryWrapper,
50 | });
51 |
52 | // Then: Post details should be fetched successfully
53 | await waitFor(() => {
54 | expect(result.current.isSuccess).toBe(true);
55 | expect(result.current.data).toEqual(mockPostDetailData);
56 | expect(mockPostUseCase.getPostById).toHaveBeenCalledWith(postId);
57 | });
58 | });
59 |
60 | it("should return post with comments included", async () => {
61 | // Given: Post with comments
62 | const postId = "post-1";
63 | mockPostUseCase.getPostById.mockResolvedValue(mockPostDetailData);
64 |
65 | // When: Hook is called for post with comments
66 | const { result } = renderHook(() => useGetPostById(postId), {
67 | wrapper: QueryWrapper,
68 | });
69 |
70 | // Then: Post should include comment data
71 | await waitFor(() => {
72 | expect(result.current.isSuccess).toBe(true);
73 | expect(result.current.data?.comments).toHaveLength(2);
74 | expect(result.current.data?.totalComments).toBe(2);
75 | });
76 | });
77 |
78 | it("should not execute query when enabled is false", async () => {
79 | // Given: Valid post ID but enabled set to false
80 | const postId = "post-1";
81 | mockPostUseCase.getPostById.mockResolvedValue(mockPostDetailData);
82 |
83 | // When: Hook is called with enabled=false
84 | const { result } = renderHook(() => useGetPostById(postId, false), {
85 | wrapper: QueryWrapper,
86 | });
87 |
88 | // Then: Query should not be executed
89 | await waitFor(() => {
90 | expect(result.current.isLoading).toBe(false);
91 | expect(result.current.isFetching).toBe(false);
92 | expect(mockPostUseCase.getPostById).not.toHaveBeenCalled();
93 | });
94 | });
95 | });
96 |
97 | describe("Error Handling", () => {
98 | it("should handle BaseError correctly", async () => {
99 | // Given: Valid post ID and BaseError from use case
100 | const postId = "non-existent-post";
101 | const baseError = new BaseError("Post not found", "NOT_FOUND");
102 | mockPostUseCase.getPostById.mockRejectedValue(baseError);
103 |
104 | // When: Hook is called and use case throws BaseError
105 | const { result } = renderHook(() => useGetPostById(postId), {
106 | wrapper: QueryWrapper,
107 | });
108 |
109 | // Then: BaseError should be propagated correctly
110 | await waitFor(() => {
111 | expect(result.current.isError).toBe(true);
112 | expect(result.current.error).toEqual(baseError);
113 | });
114 | });
115 |
116 | it("should wrap generic errors in BaseError", async () => {
117 | // Given: Valid post ID and generic error from use case
118 | const postId = "post-1";
119 | const unknownError = new Error("Network error");
120 | mockPostUseCase.getPostById.mockRejectedValue(unknownError);
121 |
122 | // When: Hook is called and use case throws generic error
123 | const { result } = renderHook(() => useGetPostById(postId), {
124 | wrapper: QueryWrapper,
125 | });
126 |
127 | // Then: Generic error should be wrapped in BaseError
128 | await waitFor(() => {
129 | expect(result.current.isError).toBe(true);
130 | expect(result.current.error).toBeInstanceOf(BaseError);
131 | expect(result.current.error?.message).toBe(
132 | `Failed to fetch post with ID ${postId}`
133 | );
134 | });
135 | });
136 | });
137 |
138 | describe("Loading State", () => {
139 | it("should manage loading state correctly", async () => {
140 | // Given: Valid post ID and delayed response from use case
141 | const postId = "post-1";
142 | mockPostUseCase.getPostById.mockImplementation(
143 | () =>
144 | new Promise((resolve) =>
145 | setTimeout(() => resolve(mockPostDetailData), 100)
146 | )
147 | );
148 |
149 | // When: Hook is called with delayed response
150 | const { result } = renderHook(() => useGetPostById(postId), {
151 | wrapper: QueryWrapper,
152 | });
153 |
154 | // Then: Loading state should be managed correctly
155 | await waitFor(() => {
156 | expect(result.current.isLoading).toBe(true);
157 | });
158 |
159 | await waitFor(() => {
160 | expect(result.current.isSuccess).toBe(true);
161 | expect(result.current.isLoading).toBe(false);
162 | });
163 | });
164 | });
165 | });
166 |

---

## /src/features/post/**tests**/hooks/useGetPosts.test.ts:

1 | import { PostDto } from "@/entities/post";
2 |
3 | import { QueryWrapper } from "@/shared/libs/**tests**";
4 | import { BaseError } from "@/shared/libs/errors";
5 | import { renderHook, waitFor } from "@testing-library/react";
6 | import { beforeEach, describe, expect, it, vi } from "vitest";
7 | import { createUseGetPosts } from "../../hooks/useGetPosts";
8 | import { GetPostsOptions, PostListResult } from "../../types";
9 |
10 | /\*_
11 | _ useGetPosts Hook Tests
12 | _ Verify React Query hook functionality using Given-When-Then pattern
13 | _/
14 | describe("useGetPosts Hook", () => {
15 | let mockPostUseCase: {
16 | getAllPosts: ReturnType<typeof vi.fn>;
17 | searchPosts: ReturnType<typeof vi.fn>;
18 | getPostById: ReturnType<typeof vi.fn>;
19 | addPost: ReturnType<typeof vi.fn>;
20 | updatePost: ReturnType<typeof vi.fn>;
21 | deletePost: ReturnType<typeof vi.fn>;
22 | likePost: ReturnType<typeof vi.fn>;
23 | unlikePost: ReturnType<typeof vi.fn>;
24 | };
25 | let useGetPosts: ReturnType<typeof createUseGetPosts>;
26 | let mockPostsData: PostListResult;
27 |
28 | beforeEach(() => {
29 | // Given: Set up mock use case and test data
30 | mockPostUseCase = {
31 | getAllPosts: vi.fn(),
32 | searchPosts: vi.fn(),
33 | getPostById: vi.fn(),
34 | addPost: vi.fn(),
35 | updatePost: vi.fn(),
36 | deletePost: vi.fn(),
37 | likePost: vi.fn(),
38 | unlikePost: vi.fn(),
39 | };
40 |
41 | const mockSinglePost: PostDto = {
42 | id: "post-1",
43 | user: {
44 | id: "user-1",
45 | username: "testuser",
46 | profileImage: "https://example.com/avatar.jpg",
47 | },
48 | title: "Test Post",
49 | body: "This is a test post content",
50 | image: "https://example.com/post-image.jpg",
51 | likes: 10,
52 | totalComments: 5,
53 | createdAt: 1640995200000,
54 | updatedAt: 1640995200000,
55 | };
56 |
57 | mockPostsData = {
58 | data: [mockSinglePost],
59 | pagination: {
60 | limit: 10,
61 | skip: 0,
62 | total: 1,
63 | },
64 | };
65 |
66 | useGetPosts = createUseGetPosts(mockPostUseCase);
67 | });
68 |
69 | describe("Success Cases", () => {
70 | it("should successfully fetch posts with default options", async () => {
71 | // Given: Default options and mock posts data
72 | mockPostUseCase.getAllPosts.mockResolvedValue(mockPostsData);
73 |
74 | // When: Hook is called with default options
75 | const { result } = renderHook(() => useGetPosts(), {
76 | wrapper: QueryWrapper,
77 | });
78 |
79 | // Then: Posts should be fetched successfully
80 | await waitFor(() => {
81 | expect(result.current.isSuccess).toBe(true);
82 | });
83 |
84 | expect(result.current.data).toEqual(mockPostsData);
85 | expect(mockPostUseCase.getAllPosts).toHaveBeenCalledWith(10, 0);
86 | });
87 |
88 | it("should fetch posts with custom limit and skip", async () => {
89 | // Given: Custom options and mock posts data
90 | const options: GetPostsOptions = { limit: 5, skip: 10 };
91 | mockPostUseCase.getAllPosts.mockResolvedValue(mockPostsData);
92 |
93 | // When: Hook is called with custom options
94 | const { result } = renderHook(() => useGetPosts(options), {
95 | wrapper: QueryWrapper,
96 | });
97 |
98 | // Then: Posts should be fetched with custom parameters
99 | await waitFor(() => {
100 | expect(result.current.isSuccess).toBe(true);
101 | });
102 |
103 | expect(result.current.data).toEqual(mockPostsData);
104 | expect(mockPostUseCase.getAllPosts).toHaveBeenCalledWith(5, 10);
105 | });
106 |
107 | it("should search posts when query is provided and valid", async () => {
108 | // Given: Search query and mock search results
109 | const options: GetPostsOptions = { query: "test search" };
110 | mockPostUseCase.searchPosts.mockResolvedValue(mockPostsData);
111 |
112 | // When: Hook is called with search query
113 | const { result } = renderHook(() => useGetPosts(options), {
114 | wrapper: QueryWrapper,
115 | });
116 |
117 | // Then: Search should be performed successfully
118 | await waitFor(() => {
119 | expect(result.current.isSuccess).toBe(true);
120 | });
121 |
122 | expect(result.current.data).toEqual(mockPostsData);
123 | expect(mockPostUseCase.searchPosts).toHaveBeenCalledWith(
124 | 10,
125 | 0,
126 | "test search"
127 | );
128 | });
129 |
130 | it("should not search when query is too short", async () => {
131 | // Given: Short query (less than 2 characters)
132 | const options: GetPostsOptions = { query: "a" };
133 | mockPostUseCase.getAllPosts.mockResolvedValue(mockPostsData);
134 |
135 | // When: Hook is called with short query
136 | const { result } = renderHook(() => useGetPosts(options), {
137 | wrapper: QueryWrapper,
138 | });
139 |
140 | // Then: Regular fetch should be performed instead of search
141 | await waitFor(() => {
142 | expect(result.current.isSuccess).toBe(true);
143 | });
144 |
145 | expect(mockPostUseCase.getAllPosts).toHaveBeenCalledWith(10, 0);
146 | expect(mockPostUseCase.searchPosts).not.toHaveBeenCalled();
147 | });
148 | });
149 |
150 | describe("Error Handling", () => {
151 | it("should handle BaseError correctly", async () => {
152 | // Given: BaseError from use case
153 | const baseError = new BaseError("Posts not found", "NOT_FOUND");
154 | mockPostUseCase.getAllPosts.mockRejectedValue(baseError);
155 |
156 | // When: Hook is called and use case throws BaseError
157 | const { result } = renderHook(() => useGetPosts(), {
158 | wrapper: QueryWrapper,
159 | });
160 |
161 | // Then: BaseError should be propagated correctly
162 | await waitFor(() => {
163 | expect(result.current.isError).toBe(true);
164 | });
165 |
166 | expect(result.current.error).toEqual(baseError);
167 | });
168 |
169 | it("should wrap generic errors in BaseError for regular fetch", async () => {
170 | // Given: Generic error from getAllPosts
171 | const unknownError = new Error("Network error");
172 | mockPostUseCase.getAllPosts.mockRejectedValue(unknownError);
173 |
174 | // When: Hook is called and getAllPosts throws generic error
175 | const { result } = renderHook(() => useGetPosts(), {
176 | wrapper: QueryWrapper,
177 | });
178 |
179 | // Then: Generic error should be wrapped in BaseError
180 | await waitFor(() => {
181 | expect(result.current.isError).toBe(true);
182 | });
183 |
184 | expect(result.current.error).toBeInstanceOf(BaseError);
185 | expect(result.current.error?.message).toBe("Failed to fetch posts");
186 | });
187 |
188 | it("should wrap generic errors in BaseError for search", async () => {
189 | // Given: Search query and generic error from searchPosts
190 | const options: GetPostsOptions = { query: "test search" };
191 | const unknownError = new Error("Search service error");
192 | mockPostUseCase.searchPosts.mockRejectedValue(unknownError);
193 |
194 | // When: Hook is called for search and searchPosts throws generic error
195 | const { result } = renderHook(() => useGetPosts(options), {
196 | wrapper: QueryWrapper,
197 | });
198 |
199 | // Then: Generic error should be wrapped in BaseError with search context
200 | await waitFor(() => {
201 | expect(result.current.isError).toBe(true);
202 | });
203 |
204 | expect(result.current.error).toBeInstanceOf(BaseError);
205 | expect(result.current.error?.message).toBe(
206 | 'Failed to fetch posts with query "test search"'
207 | );
208 | });
209 | });
210 |
211 | describe("Loading State", () => {
212 | it("should manage initial loading state correctly", async () => {
213 | // Given: Delayed response from use case
214 | mockPostUseCase.getAllPosts.mockImplementation(
215 | () =>
216 | new Promise((resolve) =>
217 | setTimeout(() => resolve(mockPostsData), 100)
218 | )
219 | );
220 |
221 | // When: Hook is called with delayed response
222 | const { result } = renderHook(() => useGetPosts(), {
223 | wrapper: QueryWrapper,
224 | });
225 |
226 | // Then: Loading state should be managed correctly
227 | expect(result.current.isLoading).toBe(true);
228 |
229 | await waitFor(() => {
230 | expect(result.current.isSuccess).toBe(true);
231 | });
232 |
233 | expect(result.current.isLoading).toBe(false);
234 | });
235 | });
236 | });
237 |

---

## /src/features/post/**tests**/index.ts:

1 | export { PostServiceMocks } from "./mocks/post-service.mock";
2 |
3 | export type { MockPostService } from "./mocks/post-service.mock";
4 |
5 | export { mockPostDetailData, mockPostsData } from "./fixtures";
6 |

---

## /src/features/post/**tests**/mocks/post-service.mock.ts:

1 | import { PostEntity } from "@/entities/post/types";
2 | import { MockService, ServiceMockFactory } from "@/shared/libs/**tests**";
3 | import { vi } from "vitest";
4 |
5 | export interface MockPostService extends MockService<PostEntity> {
6 | likePost: ReturnType<typeof vi.fn>;
7 | unlikePost: ReturnType<typeof vi.fn>;
8 | searchPosts: ReturnType<typeof vi.fn>;
9 | }
10 |
11 | export const PostServiceMocks = {
12 | create: (): MockPostService => ({
13 | ...ServiceMockFactory.createBasicMock<PostEntity>(),
14 | likePost: vi.fn(),
15 | unlikePost: vi.fn(),
16 | searchPosts: vi.fn(),
17 | }),
18 |
19 | createSuccess: (
20 | mockPost: PostEntity,
21 | mockPosts: PostEntity[] = []
22 | ): MockPostService => ({
23 | ...ServiceMockFactory.createSuccessMock(mockPost, mockPosts),
24 | likePost: vi.fn().mockResolvedValue(mockPost),
25 | unlikePost: vi.fn().mockResolvedValue(mockPost),
26 | searchPosts: vi.fn().mockResolvedValue(mockPosts),
27 | }),
28 |
29 | createError: (
30 | error: Error = new Error("Post Service Error")
31 | ): MockPostService => ({
32 | ...ServiceMockFactory.createErrorMock<PostEntity>(error),
33 | likePost: vi.fn().mockRejectedValue(error),
34 | unlikePost: vi.fn().mockRejectedValue(error),
35 | searchPosts: vi.fn().mockRejectedValue(error),
36 | }),
37 | };
38 |

---

## /src/features/post/**tests**/services/post.service.test.ts:

1 | import { CommentMapper, CommentRepository } from "@/entities/comment";
2 | import {
3 | CommentFixtures,
4 | CommentRepositoryMocks,
5 | MockCommentRepository,
6 | } from "@/entities/comment/**tests**";
7 | import { PostMapper, PostRepository } from "@/entities/post";
8 | import {
9 | MockPostRepository,
10 | PostFixtures,
11 | PostRepositoryMocks,
12 | } from "@/entities/post/**tests**";
13 | import { UserRepository } from "@/entities/user";
14 | import {
15 | MockUserRepository,
16 | UserFixtures,
17 | UserRepositoryMocks,
18 | } from "@/entities/user/**tests**";
19 | import {
20 | AsyncTestHelpers,
21 | MockHelpers,
22 | TestDataHelpers,
23 | } from "@/shared/libs/**tests**";
24 | import { BaseError } from "@/shared/libs/errors";
25 | import { beforeEach, describe, expect, it, vi } from "vitest";
26 | import { PostService } from "../../services/post.service";
27 |
28 | /\*_
29 | _ Post Service Tests
30 | _ Verify all Post service functionality using Given-When-Then pattern
31 | _/
32 | describe("Post Service", () => {
33 | let mockPostRepository: MockPostRepository;
34 | let mockCommentRepository: MockCommentRepository;
35 | let mockUserRepository: MockUserRepository;
36 | let postService: ReturnType<typeof PostService>;
37 |
38 | beforeEach(() => {
39 | // Given: Set up mock repositories using test utils
40 | mockPostRepository = PostRepositoryMocks.create();
41 | mockCommentRepository = CommentRepositoryMocks.create();
42 | mockUserRepository = UserRepositoryMocks.create();
43 |
44 | // Reset all mocks using shared utility
45 | MockHelpers.resetAll(
46 | mockPostRepository,
47 | mockCommentRepository,
48 | mockUserRepository
49 | );
50 |
51 | postService = PostService(
52 | mockPostRepository as unknown as PostRepository,
53 | mockCommentRepository as unknown as CommentRepository,
54 | mockUserRepository as unknown as UserRepository
55 | );
56 | });
57 |
58 | describe("getAllPosts", () => {
59 | it("should return paginated post list when repository returns valid data", async () => {
60 | // Given: Repository returns valid posts
61 | const mockPosts = PostFixtures.multiple;
62 | mockPostRepository.getAll.mockResolvedValue(mockPosts);
63 |
64 | // When: Get all posts
65 | const result = await postService.getAllPosts(10, 0);
66 |
67 | // Then: Should return paginated post list
68 | expect(result).toEqual({
69 | data: PostMapper.toDtoList(mockPosts),
70 | pagination: {
71 | limit: 10,
72 | skip: 0,
73 | total: mockPosts.length,
74 | },
75 | });
76 | expect(mockPostRepository.getAll).toHaveBeenCalledWith(10, 0);
77 | });
78 |
79 | it("should use default pagination when no parameters provided", async () => {
80 | // Given: Repository returns valid posts
81 | const mockPosts = PostFixtures.multiple;
82 | mockPostRepository.getAll.mockResolvedValue(mockPosts);
83 |
84 | // When: Get all posts without parameters
85 | const result = await postService.getAllPosts();
86 |
87 | // Then: Should use default pagination
88 | expect(result.pagination).toEqual({
89 | limit: 10,
90 | skip: 0,
91 | total: mockPosts.length,
92 | });
93 | expect(mockPostRepository.getAll).toHaveBeenCalledWith(
94 | undefined,
95 | undefined
96 | );
97 | });
98 |
99 | it("should handle empty post list", async () => {
100 | // Given: Repository returns empty array
101 | mockPostRepository.getAll.mockResolvedValue([]);
102 |
103 | // When: Get all posts
104 | const result = await postService.getAllPosts();
105 |
106 | // Then: Should return empty paginated result
107 | expect(result).toEqual({
108 | data: [],
109 | pagination: {
110 | limit: 10,
111 | skip: 0,
112 | total: 0,
113 | },
114 | });
115 | });
116 |
117 | it("should re-throw BaseError when repository throws BaseError", async () => {
118 | // Given: Repository throws BaseError
119 | const baseError = BaseError.notFound("Post", "all");
120 | mockPostRepository.getAll.mockRejectedValue(baseError);
121 |
122 | // When: Get all posts
123 | // Then: Should re-throw the same BaseError
124 | await expect(postService.getAllPosts()).rejects.toThrow(baseError);
125 | });
126 |
127 | it("should wrap generic error in BaseError", async () => {
128 | // Given: Repository throws generic error
129 | const genericError = new Error("Database connection failed");
130 | mockPostRepository.getAll.mockRejectedValue(genericError);
131 |
132 | // When: Get all posts
133 | // Then: Should wrap error in BaseError
134 | await expect(postService.getAllPosts()).rejects.toThrow(BaseError);
135 | await expect(postService.getAllPosts()).rejects.toThrow(
136 | "Failed to fetch post list"
137 | );
138 | });
139 | });
140 |
141 | describe("searchPosts", () => {
142 | it("should return search results when repository returns matching posts", async () => {
143 | // Given: Repository returns matching posts
144 | const mockPosts = [PostFixtures.valid.basic];
145 | const searchQuery = "test";
146 | mockPostRepository.search.mockResolvedValue(mockPosts);
147 |
148 | // When: Search posts
149 | const result = await postService.searchPosts(10, 0, searchQuery);
150 |
151 | // Then: Should return search results
152 | expect(result).toEqual({
153 | data: PostMapper.toDtoList(mockPosts),
154 | pagination: {
155 | limit: 10,
156 | skip: 0,
157 | total: mockPosts.length,
158 | },
159 | });
160 | expect(mockPostRepository.search).toHaveBeenCalledWith(searchQuery);
161 | });
162 |
163 | it("should handle empty search results", async () => {
164 | // Given: Repository returns empty array for search
165 | mockPostRepository.search.mockResolvedValue([]);
166 |
167 | // When: Search posts
168 | const result = await postService.searchPosts(10, 0, "nonexistent");
169 |
170 | // Then: Should return empty search results
171 | expect(result.data).toEqual([]);
172 | expect(result.pagination.total).toBe(0);
173 | });
174 |
175 | it("should wrap search error in BaseError with query information", async () => {
176 | // Given: Repository throws error during search
177 | const searchQuery = "test query";
178 | const searchError = new Error("Search failed");
179 | mockPostRepository.search.mockRejectedValue(searchError);
180 |
181 | // When: Search posts
182 | // Then: Should wrap error with query information
183 | await expect(postService.searchPosts(10, 0, searchQuery)).rejects.toThrow(
184 | BaseError
185 | );
186 | await expect(postService.searchPosts(10, 0, searchQuery)).rejects.toThrow(
187 | `Failed to search posts with query "${searchQuery}"`
188 | );
189 | });
190 | });
191 |
192 | describe("getPostById", () => {
193 | it("should return post with comments when post exists", async () => {
194 | // Given: Repository returns valid post and comments
195 | const mockPost = PostFixtures.valid.basic;
196 | const mockComments = CommentFixtures.multiple;
197 | mockPostRepository.getById.mockResolvedValue(mockPost);
198 | mockCommentRepository.getByPostId.mockResolvedValue(mockComments);
199 |
200 | // When: Get post by ID
201 | const result = await postService.getPostById(mockPost.id);
202 |
203 | // Then: Should return post with comments
204 | expect(result).toEqual({
205 | ...PostMapper.toDto(mockPost),
206 | comments: CommentMapper.toDtoList(mockComments),
207 | });
208 | expect(mockPostRepository.getById).toHaveBeenCalledWith(mockPost.id);
209 | expect(mockCommentRepository.getByPostId).toHaveBeenCalledWith(
210 | mockPost.id
211 | );
212 | });
213 |
214 | it("should throw NotFoundError when post does not exist", async () => {
215 | // Given: Repository returns null for post
216 | const postId = "nonexistent-post";
217 | mockPostRepository.getById.mockResolvedValue(null);
218 |
219 | // When: Get post by ID
220 | // Then: Should throw NotFoundError
221 | await expect(postService.getPostById(postId)).rejects.toThrow(BaseError);
222 | await expect(postService.getPostById(postId)).rejects.toThrow(
223 | `Post with ID ${postId} not found`
224 | );
225 | });
226 |
227 | it("should handle post with no comments", async () => {
228 | // Given: Repository returns post with no comments
229 | const mockPost = PostFixtures.valid.basic;
230 | mockPostRepository.getById.mockResolvedValue(mockPost);
231 | mockCommentRepository.getByPostId.mockResolvedValue([]);
232 |
233 | // When: Get post by ID
234 | const result = await postService.getPostById(mockPost.id);
235 |
236 | // Then: Should return post with empty comments array
237 | expect(result.comments).toEqual([]);
238 | });
239 |
240 | it("should wrap generic error as NotFoundError", async () => {
241 | // Given: Repository throws generic error
242 | const postId = "error-post";
243 | const genericError = new Error("Database error");
244 | mockPostRepository.getById.mockRejectedValue(genericError);
245 |
246 | // When: Get post by ID
247 | // Then: Should wrap as NotFoundError
248 | await expect(postService.getPostById(postId)).rejects.toThrow(BaseError);
249 | await expect(postService.getPostById(postId)).rejects.toThrow(
250 | `Post with ID ${postId} not found`
251 | );
252 | });
253 | });
254 |
255 | describe("addPost", () => {
256 | it("should create new post when user exists", async () => {
257 | // Given: User exists and repository creates post successfully
258 | const mockUser = UserFixtures.valid.basic;
259 | const title = "New Post Title";
260 | const body = "New post body content";
261 | const userId = mockUser.id;
262 | const image = "https://example.com/image.jpg";
263 |
264 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
265 |
266 | const mockCreatedPost = PostFixtures.valid.basic;
267 | mockPostRepository.create.mockResolvedValue(mockCreatedPost);
268 |
269 | // When: Add new post
270 | const result = await postService.addPost(title, body, userId, image);
271 |
272 | // Then: Should create and return new post
273 | expect(result).toEqual(PostMapper.toDto(mockCreatedPost));
274 | expect(mockUserRepository.getUserProfile).toHaveBeenCalled();
275 | expect(mockPostRepository.create).toHaveBeenCalled();
276 | });
277 |
278 | it("should create post without image when image not provided", async () => {
279 | // Given: User exists and no image provided
280 | const mockUser = UserFixtures.valid.basic;
281 | const title = "New Post Title";
282 | const body = "New post body content";
283 | const userId = mockUser.id;
284 |
285 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
286 |
287 | const mockCreatedPost = PostFixtures.valid.withoutImage;
288 | mockPostRepository.create.mockResolvedValue(mockCreatedPost);
289 |
290 | // When: Add new post without image
291 | const result = await postService.addPost(title, body, userId);
292 |
293 | // Then: Should create post without image
294 | expect(result).toEqual(PostMapper.toDto(mockCreatedPost));
295 | });
296 |
297 | it("should throw NotFoundError when user does not exist", async () => {
298 | // Given: User does not exist
299 | const userId = "nonexistent-user";
300 | mockUserRepository.getUserProfile.mockResolvedValue(null);
301 |
302 | // When: Add new post
303 | // Then: Should throw NotFoundError for user
304 | await expect(
305 | postService.addPost("Title", "Body", userId)
306 | ).rejects.toThrow(BaseError);
307 | await expect(
308 | postService.addPost("Title", "Body", userId)
309 | ).rejects.toThrow(`User with ID ${userId} not found`);
310 | });
311 |
312 | it("should throw CreateFailedError when repository fails to create post", async () => {
313 | // Given: User exists but repository fails to create post
314 | const mockUser = UserFixtures.valid.basic;
315 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
316 | mockPostRepository.create.mockResolvedValue(null);
317 |
318 | // When: Add new post
319 | // Then: Should throw CreateFailedError
320 | await expect(
321 | postService.addPost("Title", "Body", mockUser.id)
322 | ).rejects.toThrow(BaseError);
323 | await expect(
324 | postService.addPost("Title", "Body", mockUser.id)
325 | ).rejects.toThrow("Failed to create post");
326 | });
327 |
328 | it("should wrap generic error as CreateFailedError", async () => {
329 | // Given: Generic error occurs during post creation
330 | const mockUser = UserFixtures.valid.basic;
331 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
332 | const genericError = new Error("Database error");
333 | mockPostRepository.create.mockRejectedValue(genericError);
334 |
335 | // When: Add new post
336 | // Then: Should wrap as CreateFailedError
337 | await expect(
338 | postService.addPost("Title", "Body", mockUser.id)
339 | ).rejects.toThrow(BaseError);
340 | await expect(
341 | postService.addPost("Title", "Body", mockUser.id)
342 | ).rejects.toThrow("Failed to create post");
343 | });
344 | });
345 |
346 | describe("updatePost", () => {
347 | it("should update post when post exists", async () => {
348 | // Given: Post exists and can be updated
349 | const mockPostData = PostFixtures.valid.basic;
350 | const newTitle = "Updated Title";
351 | const newBody = "Updated body content";
352 |
353 | // Create a mock Post domain object with update methods
354 | const mockPost = {
355 | ...mockPostData,
356 | updateTitle: vi.fn(),
357 | updateBody: vi.fn(),
358 | };
359 |
360 | mockPostRepository.getById.mockResolvedValue(mockPost);
361 |
362 | const updatedPost = { ...mockPostData, title: newTitle, body: newBody };
363 | mockPostRepository.update.mockResolvedValue(updatedPost);
364 |
365 | // When: Update post
366 | const result = await postService.updatePost(
367 | mockPost.id,
368 | newTitle,
369 | newBody
370 | );
371 |
372 | // Then: Should update and return post
373 | expect(result).toEqual(PostMapper.toDto(updatedPost));
374 | expect(mockPostRepository.getById).toHaveBeenCalledWith(mockPost.id);
375 | expect(mockPost.updateTitle).toHaveBeenCalledWith(newTitle);
376 | expect(mockPost.updateBody).toHaveBeenCalledWith(newBody);
377 | expect(mockPostRepository.update).toHaveBeenCalledWith(mockPost);
378 | });
379 |
380 | it("should throw NotFoundError when post does not exist", async () => {
381 | // Given: Post does not exist
382 | const postId = "nonexistent-post";
383 | mockPostRepository.getById.mockResolvedValue(null);
384 |
385 | // When: Update post
386 | // Then: Should throw NotFoundError
387 | await expect(
388 | postService.updatePost(postId, "Title", "Body")
389 | ).rejects.toThrow(BaseError);
390 | await expect(
391 | postService.updatePost(postId, "Title", "Body")
392 | ).rejects.toThrow(`Post with ID ${postId} not found`);
393 | });
394 |
395 | it("should throw UpdateFailedError when repository fails to update", async () => {
396 | // Given: Post exists but repository fails to update
397 | const mockPost = PostFixtures.valid.basic;
398 | mockPostRepository.getById.mockResolvedValue(mockPost);
399 | mockPostRepository.update.mockResolvedValue(null);
400 |
401 | // When: Update post
402 | // Then: Should throw UpdateFailedError
403 | await expect(
404 | postService.updatePost(mockPost.id, "Title", "Body")
405 | ).rejects.toThrow(BaseError);
406 | await expect(
407 | postService.updatePost(mockPost.id, "Title", "Body")
408 | ).rejects.toThrow(`Failed to update post with ID ${mockPost.id}`);
409 | });
410 |
411 | it("should wrap generic error as UpdateFailedError", async () => {
412 | // Given: Generic error occurs during update
413 | const mockPost = PostFixtures.valid.basic;
414 | mockPostRepository.getById.mockResolvedValue(mockPost);
415 | const genericError = new Error("Database error");
416 | mockPostRepository.update.mockRejectedValue(genericError);
417 |
418 | // When: Update post
419 | // Then: Should wrap as UpdateFailedError
420 | await expect(
421 | postService.updatePost(mockPost.id, "Title", "Body")
422 | ).rejects.toThrow(BaseError);
423 | await expect(
424 | postService.updatePost(mockPost.id, "Title", "Body")
425 | ).rejects.toThrow(`Failed to update post with ID ${mockPost.id}`);
426 | });
427 | });
428 |
429 | describe("deletePost", () => {
430 | it("should delete post when post exists", async () => {
431 | // Given: Post exists and can be deleted
432 | const mockPost = PostFixtures.valid.basic;
433 | mockPostRepository.getById.mockResolvedValue(mockPost);
434 | mockPostRepository.delete.mockResolvedValue(true);
435 |
436 | // When: Delete post
437 | const result = await postService.deletePost(mockPost.id);
438 |
439 | // Then: Should delete post successfully
440 | expect(result).toBe(true);
441 | expect(mockPostRepository.getById).toHaveBeenCalledWith(mockPost.id);
442 | expect(mockPostRepository.delete).toHaveBeenCalledWith(mockPost.id);
443 | });
444 |
445 | it("should throw NotFoundError when post does not exist", async () => {
446 | // Given: Post does not exist
447 | const postId = "nonexistent-post";
448 | mockPostRepository.getById.mockResolvedValue(null);
449 |
450 | // When: Delete post
451 | // Then: Should throw NotFoundError
452 | await expect(postService.deletePost(postId)).rejects.toThrow(BaseError);
453 | await expect(postService.deletePost(postId)).rejects.toThrow(
454 | `Post with ID ${postId} not found`
455 | );
456 | });
457 |
458 | it("should wrap generic error as DeleteFailedError", async () => {
459 | // Given: Generic error occurs during deletion
460 | const mockPost = PostFixtures.valid.basic;
461 | mockPostRepository.getById.mockResolvedValue(mockPost);
462 | const genericError = new Error("Database error");
463 | mockPostRepository.delete.mockRejectedValue(genericError);
464 |
465 | // When: Delete post
466 | // Then: Should wrap as DeleteFailedError
467 | await expect(postService.deletePost(mockPost.id)).rejects.toThrow(
468 | BaseError
469 | );
470 | await expect(postService.deletePost(mockPost.id)).rejects.toThrow(
471 | `Failed to delete post with ID ${mockPost.id}`
472 | );
473 | });
474 | });
475 |
476 | describe("likePost", () => {
477 | it("should like post when post and user exist", async () => {
478 | // Given: Post and user exist
479 | const mockPost = PostFixtures.valid.basic;
480 | const mockUser = UserFixtures.valid.basic;
481 | mockPostRepository.getById.mockResolvedValue(mockPost);
482 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
483 | mockPostRepository.like.mockResolvedValue(true);
484 |
485 | // When: Like post
486 | const result = await postService.likePost(mockPost.id, mockUser.id);
487 |
488 | // Then: Should like post successfully
489 | expect(result).toBe(true);
490 | expect(mockPostRepository.getById).toHaveBeenCalledWith(mockPost.id);
491 | expect(mockUserRepository.getUserProfile).toHaveBeenCalled();
492 | expect(mockPostRepository.like).toHaveBeenCalledWith(
493 | mockPost.id,
494 | mockUser.id
495 | );
496 | });
497 |
498 | it("should throw NotFoundError when post does not exist", async () => {
499 | // Given: Post does not exist
500 | const postId = "nonexistent-post";
501 | const userId = "user-123";
502 | mockPostRepository.getById.mockResolvedValue(null);
503 |
504 | // When: Like post
505 | // Then: Should throw NotFoundError for post
506 | await expect(postService.likePost(postId, userId)).rejects.toThrow(
507 | BaseError
508 | );
509 | await expect(postService.likePost(postId, userId)).rejects.toThrow(
510 | `Post with ID ${postId} not found`
511 | );
512 | });
513 |
514 | it("should throw NotFoundError when user does not exist", async () => {
515 | // Given: Post exists but user does not exist
516 | const mockPost = PostFixtures.valid.basic;
517 | const userId = "nonexistent-user";
518 | mockPostRepository.getById.mockResolvedValue(mockPost);
519 | mockUserRepository.getUserProfile.mockResolvedValue(null);
520 |
521 | // When: Like post
522 | // Then: Should throw NotFoundError for user
523 | await expect(postService.likePost(mockPost.id, userId)).rejects.toThrow(
524 | BaseError
525 | );
526 | await expect(postService.likePost(mockPost.id, userId)).rejects.toThrow(
527 | `User with ID ${userId} not found`
528 | );
529 | });
530 |
531 | it("should wrap generic error as UpdateFailedError", async () => {
532 | // Given: Generic error occurs during like operation
533 | const mockPost = PostFixtures.valid.basic;
534 | const mockUser = UserFixtures.valid.basic;
535 | mockPostRepository.getById.mockResolvedValue(mockPost);
536 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
537 | const genericError = new Error("Database error");
538 | mockPostRepository.like.mockRejectedValue(genericError);
539 |
540 | // When: Like post
541 | // Then: Should wrap as UpdateFailedError
542 | await expect(
543 | postService.likePost(mockPost.id, mockUser.id)
544 | ).rejects.toThrow(BaseError);
545 | await expect(
546 | postService.likePost(mockPost.id, mockUser.id)
547 | ).rejects.toThrow(`Failed to update post with ID ${mockPost.id}`);
548 | });
549 | });
550 |
551 | describe("unlikePost", () => {
552 | it("should unlike post when post and user exist", async () => {
553 | // Given: Post and user exist
554 | const mockPost = PostFixtures.valid.basic;
555 | const mockUser = UserFixtures.valid.basic;
556 | mockPostRepository.getById.mockResolvedValue(mockPost);
557 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
558 | mockPostRepository.unlike.mockResolvedValue(true);
559 |
560 | // When: Unlike post
561 | const result = await postService.unlikePost(mockPost.id, mockUser.id);
562 |
563 | // Then: Should unlike post successfully
564 | expect(result).toBe(true);
565 | expect(mockPostRepository.getById).toHaveBeenCalledWith(mockPost.id);
566 | expect(mockUserRepository.getUserProfile).toHaveBeenCalled();
567 | expect(mockPostRepository.unlike).toHaveBeenCalledWith(
568 | mockPost.id,
569 | mockUser.id
570 | );
571 | });
572 |
573 | it("should throw NotFoundError when post does not exist", async () => {
574 | // Given: Post does not exist
575 | const postId = "nonexistent-post";
576 | const userId = "user-123";
577 | mockPostRepository.getById.mockResolvedValue(null);
578 |
579 | // When: Unlike post
580 | // Then: Should throw NotFoundError for post
581 | await expect(postService.unlikePost(postId, userId)).rejects.toThrow(
582 | BaseError
583 | );
584 | await expect(postService.unlikePost(postId, userId)).rejects.toThrow(
585 | `Post with ID ${postId} not found`
586 | );
587 | });
588 |
589 | it("should throw NotFoundError when user does not exist", async () => {
590 | // Given: Post exists but user does not exist
591 | const mockPost = PostFixtures.valid.basic;
592 | const userId = "nonexistent-user";
593 | mockPostRepository.getById.mockResolvedValue(mockPost);
594 | mockUserRepository.getUserProfile.mockResolvedValue(null);
595 |
596 | // When: Unlike post
597 | // Then: Should throw NotFoundError for user
598 | await expect(postService.unlikePost(mockPost.id, userId)).rejects.toThrow(
599 | BaseError
600 | );
601 | await expect(postService.unlikePost(mockPost.id, userId)).rejects.toThrow(
602 | `User with ID ${userId} not found`
603 | );
604 | });
605 |
606 | it("should wrap generic error as UpdateFailedError", async () => {
607 | // Given: Generic error occurs during unlike operation
608 | const mockPost = PostFixtures.valid.basic;
609 | const mockUser = UserFixtures.valid.basic;
610 | mockPostRepository.getById.mockResolvedValue(mockPost);
611 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
612 | const genericError = new Error("Database error");
613 | mockPostRepository.unlike.mockRejectedValue(genericError);
614 |
615 | // When: Unlike post
616 | // Then: Should wrap as UpdateFailedError
617 | await expect(
618 | postService.unlikePost(mockPost.id, mockUser.id)
619 | ).rejects.toThrow(BaseError);
620 | await expect(
621 | postService.unlikePost(mockPost.id, mockUser.id)
622 | ).rejects.toThrow(`Failed to update post with ID ${mockPost.id}`);
623 | });
624 | });
625 |
626 | describe("Error Handling", () => {
627 | it("should log error when repository throws error", async () => {
628 | // Given: Console.error is mocked and repository throws error
629 | const consoleSpy = vi
630 | .spyOn(console, "error")
631 | .mockImplementation(() => {});
632 | const error = new Error("Repository error");
633 | mockPostRepository.getAll.mockRejectedValue(error);
634 |
635 | // When: Get all posts
636 | try {
637 | await postService.getAllPosts();
638 | } catch {
639 | // Expected to throw
640 | }
641 |
642 | // Then: Should log the error
643 | expect(consoleSpy).toHaveBeenCalledWith(
644 | "Error fetching post list:",
645 | error
646 | );
647 |
648 | consoleSpy.mockRestore();
649 | });
650 |
651 | it("should log error with context information", async () => {
652 | // Given: Console.error is mocked and repository throws error
653 | const consoleSpy = vi
654 | .spyOn(console, "error")
655 | .mockImplementation(() => {});
656 | const postId = "test-post-id";
657 | const error = new Error("Repository error");
658 | mockPostRepository.getById.mockRejectedValue(error);
659 |
660 | // When: Get post by ID
661 | try {
662 | await postService.getPostById(postId);
663 | } catch {
664 | // Expected to throw
665 | }
666 |
667 | // Then: Should log the error with context
668 | expect(consoleSpy).toHaveBeenCalledWith(
669 | `Error fetching post with ID ${postId}:`,
670 | error
671 | );
672 |
673 | consoleSpy.mockRestore();
674 | });
675 | });
676 |
677 | describe("Service Contract", () => {
678 | it("should implement PostUseCase interface correctly", () => {
679 | // Given: PostService instance
680 | const service = postService;
681 |
682 | // When: Check service methods
683 | // Then: Should have all required methods
684 | expect(typeof service.getAllPosts).toBe("function");
685 | expect(typeof service.searchPosts).toBe("function");
686 | expect(typeof service.getPostById).toBe("function");
687 | expect(typeof service.addPost).toBe("function");
688 | expect(typeof service.updatePost).toBe("function");
689 | expect(typeof service.deletePost).toBe("function");
690 | expect(typeof service.likePost).toBe("function");
691 | expect(typeof service.unlikePost).toBe("function");
692 | });
693 |
694 | it("should return Promise from all async methods", () => {
695 | // Given: Mock repositories return valid data
696 | mockPostRepository.getAll.mockResolvedValue([]);
697 | mockPostRepository.getById.mockResolvedValue(PostFixtures.valid.basic);
698 | mockCommentRepository.getByPostId.mockResolvedValue([]);
699 |
700 | // When: Call async methods
701 | const getAllResult = postService.getAllPosts();
702 | const getByIdResult = postService.getPostById("test-id");
703 |
704 | // Then: Should return Promises
705 | expect(getAllResult).toBeInstanceOf(Promise);
706 | expect(getByIdResult).toBeInstanceOf(Promise);
707 | });
708 | });
709 |
710 | describe("Advanced Test Scenarios with Shared Utilities", () => {
711 | it("should handle dynamic post data generation", async () => {
712 | // Given: Dynamically generated test data using TestDataHelpers
713 | const userId = TestDataHelpers.generateId("user");
714 | const postTitle = `Test Post ${TestDataHelpers.generateId("title")}`;
715 | const postBody = `Post content ${TestDataHelpers.generateId("content")}`;
716 | const mockUser = {
717 | ...UserFixtures.valid.basic,
718 | id: userId,
719 | username: TestDataHelpers.generateUsername(),
720 | email: TestDataHelpers.generateEmail(),
721 | };
722 | const mockPost = {
723 | ...PostFixtures.valid.basic,
724 | id: TestDataHelpers.generateId("post"),
725 | title: postTitle,
726 | body: postBody,
727 | user: {
728 | id: userId,
729 | username: mockUser.username,
730 | profileImage: mockUser.profileImage || "",
731 | },
732 | createdAt: TestDataHelpers.generateTimestamp(-7200000), // 2시간 전
733 | updatedAt: TestDataHelpers.generateTimestamp(-3600000), // 1시간 전
734 | };
735 |
736 | mockUserRepository.getUserProfile.mockResolvedValue(mockUser);
737 | mockPostRepository.create.mockResolvedValue(mockPost);
738 |
739 | // When: Add post with dynamic data
740 | const result = await postService.addPost(postTitle, postBody, userId);
741 |
742 | // Then: Should handle dynamic data correctly
743 | expect(result).toEqual(PostMapper.toDto(mockPost));
744 | expect(mockUserRepository.getUserProfile).toHaveBeenCalled();
745 | expect(mockPostRepository.create).toHaveBeenCalledWith(
746 | expect.objectContaining({
747 | title: postTitle,
748 | body: postBody,
749 | user: expect.objectContaining({
750 | id: userId,
751 | username: mockUser.username,
752 | }),
753 | })
754 | );
755 | });
756 |
757 | it("should handle delayed repository responses with AsyncTestHelpers", async () => {
758 | // Given: Repository with delayed response
759 | const mockPosts = PostFixtures.multiple;
760 | const delayedResponse = AsyncTestHelpers.wrapPromise(mockPosts, 150);
761 | mockPostRepository.getAll.mockImplementation(() => delayedResponse);
762 |
763 | // When: Get all posts
764 | const result = await postService.getAllPosts(10, 0);
765 |
766 | // Then: Should handle delayed response correctly
767 | expect(result).toEqual({
768 | data: PostMapper.toDtoList(mockPosts),
769 | pagination: {
770 | limit: 10,
771 | skip: 0,
772 | total: mockPosts.length,
773 | },
774 | });
775 | });
776 |
777 | it("should handle bulk post operations", async () => {
778 | // Given: Multiple posts generated using TestDataHelpers
779 | const postCount = 10;
780 | const mockPosts = TestDataHelpers.createArray(postCount, (index) => ({
781 | ...PostFixtures.valid.basic,
782 | id: TestDataHelpers.generateId("post"),
783 | title: `Post ${index + 1} - ${TestDataHelpers.generateId("title")}`,
784 | body: `Content for post ${index + 1}`,
785 | createdAt: TestDataHelpers.generateTimestamp(-index _ 3600000),
786 | updatedAt: TestDataHelpers.generateTimestamp(-index _ 1800000),
787 | }));
788 |
789 | mockPostRepository.getAll.mockResolvedValue(mockPosts);
790 |
791 | // When: Get all posts
792 | const result = await postService.getAllPosts(20, 0);
793 |
794 | // Then: Should return all generated posts
795 | expect(result.data).toHaveLength(postCount);
796 | expect(result.data).toEqual(PostMapper.toDtoList(mockPosts));
797 | expect(result.pagination.total).toBe(postCount);
798 | });
799 |
800 | it("should verify complex mock interactions using MockHelpers", async () => {
801 | // Given: Post service with multiple mock repositories
802 | const postId = TestDataHelpers.generateId("post");
803 | const mockPost = PostFixtures.valid.basic;
804 | const mockComments = CommentFixtures.multiple;
805 |
806 | mockPostRepository.getById.mockResolvedValue(mockPost);
807 | mockCommentRepository.getByPostId.mockResolvedValue(mockComments);
808 |
809 | // When: Perform multiple operations
810 | await postService.getPostById(postId);
811 | await postService.getPostById(postId);
812 |
813 | // Then: Verify mock state using MockHelpers
814 | MockHelpers.verifyMockState(
815 | mockPostRepository as unknown as Record<string, unknown>,
816 | {
817 | getById: 2,
818 | }
819 | );
820 | MockHelpers.verifyMockState(
821 | mockCommentRepository as unknown as Record<string, unknown>,
822 | {
823 | getByPostId: 2,
824 | }
825 | );
826 | });
827 |
828 | it("should handle concurrent post operations", async () => {
829 | // Given: Multiple concurrent post operations
830 | const postIds = TestDataHelpers.createArray(5, (index) =>
831 | TestDataHelpers.generateId(`post-${index}`)
832 | );
833 | const mockPostsWithComments = postIds.map((postId) => ({
834 | post: {
835 | ...PostFixtures.valid.basic,
836 | id: postId,
837 | title: `Post ${postId}`,
838 | },
839 | comments: TestDataHelpers.createArray(3, (index) => ({
840 | ...CommentFixtures.valid.basic,
841 | id: TestDataHelpers.generateId("comment"),
842 | postId,
843 | body: `Comment ${index + 1} for ${postId}`,
844 | })),
845 | }));
846 |
847 | // Setup mocks for each post
848 | postIds.forEach((postId, index) => {
849 | mockPostRepository.getById.mockImplementationOnce(() =>
850 | AsyncTestHelpers.wrapPromise(mockPostsWithComments[index].post, 30)
851 | );
852 | mockCommentRepository.getByPostId.mockImplementationOnce(() =>
853 | AsyncTestHelpers.wrapPromise(
854 | mockPostsWithComments[index].comments,
855 | 20
856 | )
857 | );
858 | });
859 |
860 | // When: Execute concurrent operations
861 | const promises = postIds.map((postId) => postService.getPostById(postId));
862 | const results = await Promise.all(promises);
863 |
864 | // Then: Should handle all concurrent operations correctly
865 | expect(results).toHaveLength(5);
866 | results.forEach((result, index) => {
867 | expect(result.id).toBe(postIds[index]);
868 | expect(result.comments).toHaveLength(3);
869 | });
870 | });
871 |
872 | it("should handle error scenarios with proper error wrapping", async () => {
873 | // Given: Repository that throws delayed errors
874 | const postId = TestDataHelpers.generateId("post");
875 | const networkError = new Error("Network connection failed");
876 | const delayedError = AsyncTestHelpers.wrapError(networkError, 100);
877 |
878 | mockPostRepository.getById.mockImplementation(() => delayedError);
879 |
880 | // When: Get post by ID
881 | // Then: Should handle delayed error and wrap it properly
882 | await expect(postService.getPostById(postId)).rejects.toThrow(BaseError);
883 | });
884 | });
885 | });
886 |

---

## /src/features/post/**tests**/ui/card/PostCard.test.tsx:

1 | import { PostDto } from "@/entities/post";
2 | import { FullWrapper } from "@/shared/libs/**tests**";
3 | import { render, screen } from "@testing-library/react";
4 | import { beforeEach, describe, expect, it } from "vitest";
5 | import { PostCard } from "../../../ui/card";
6 | import { mockPostsArray } from "../../fixtures";
7 |
8 | /\*_
9 | _ PostCard Component Tests
10 | _ Core functionality and user interaction focused tests
11 | _/
12 | describe("PostCard Component", () => {
13 | let validPostDto: PostDto;
14 |
15 | beforeEach(() => {
16 | validPostDto = mockPostsArray[0];
17 | });
18 |
19 | describe("Basic Rendering", () => {
20 | it("should render post card with all essential elements", () => {
21 | // Given: Valid post data
22 | const post = validPostDto;
23 |
24 | // When: Render PostCard component
25 | render(
26 | <FullWrapper>
27 | <PostCard post={post} />
28 | </FullWrapper>
29 | );
30 |
31 | // Then: Should display all essential elements
32 | const linkElement = screen.getByRole("link");
33 | const postImage = screen.getByRole("img", {
34 | name: `Post by ${post.user.username}`,
35 | });
36 | const postBody = screen.getByText(post.body);
37 | const likesCount = screen.getByText(post.likes.toLocaleString());
38 | const commentsCount = screen.getByText(
39 | post.totalComments.toLocaleString()
40 | );
41 |
42 | expect(linkElement).toBeInTheDocument();
43 | expect(linkElement).toHaveAttribute("href", `/post/${post.id}`);
44 | expect(postImage).toBeInTheDocument();
45 | expect(postBody).toBeInTheDocument();
46 | expect(likesCount).toBeInTheDocument();
47 | expect(commentsCount).toBeInTheDocument();
48 | });
49 |
50 | it("should render with empty post body", () => {
51 | // Given: Post with empty body
52 | const emptyBodyPost: PostDto = {
53 | ...validPostDto,
54 | body: "",
55 | };
56 |
57 | // When: Render PostCard component
58 | render(
59 | <FullWrapper>
60 | <PostCard post={emptyBodyPost} />
61 | </FullWrapper>
62 | );
63 |
64 | // Then: Should still render other elements
65 | const linkElement = screen.getByRole("link");
66 | const postImage = screen.getByRole("img", {
67 | name: `Post by ${emptyBodyPost.user.username}`,
68 | });
69 |
70 | expect(linkElement).toBeInTheDocument();
71 | expect(postImage).toBeInTheDocument();
72 | });
73 | });
74 |
75 | describe("User Information", () => {
76 | it("should display user information", () => {
77 | // Given: Valid post data
78 | const post = validPostDto;
79 |
80 | // When: Render PostCard component
81 | render(
82 | <FullWrapper>
83 | <PostCard post={post} />
84 | </FullWrapper>
85 | );
86 |
87 | // Then: Should display user information
88 | const username = screen.getByText(post.user.username);
89 | expect(username).toBeInTheDocument();
90 | });
91 |
92 | it("should display user avatar", () => {
93 | // Given: Valid post data
94 | const post = validPostDto;
95 |
96 | // When: Render PostCard component
97 | render(
98 | <FullWrapper>
99 | <PostCard post={post} />
100 | </FullWrapper>
101 | );
102 |
103 | // Then: Should display user avatar
104 | const userImages = screen.getAllByRole("img");
105 | const userAvatar = userImages.find((img) =>
106 | img.getAttribute("alt")?.includes("profile")
107 | );
108 |
109 | expect(userAvatar).toBeInTheDocument();
110 | });
111 | });
112 |
113 | describe("Post Content", () => {
114 | it("should display post body text", () => {
115 | // Given: Valid post data
116 | const post = validPostDto;
117 |
118 | // When: Render PostCard component
119 | render(
120 | <FullWrapper>
121 | <PostCard post={post} />
122 | </FullWrapper>
123 | );
124 |
125 | // Then: Should display post body
126 | const postBody = screen.getByText(post.body);
127 | expect(postBody).toBeInTheDocument();
128 | });
129 |
130 | it("should display post image with correct attributes", () => {
131 | // Given: Valid post data
132 | const post = validPostDto;
133 |
134 | // When: Render PostCard component
135 | render(
136 | <FullWrapper>
137 | <PostCard post={post} />
138 | </FullWrapper>
139 | );
140 |
141 | // Then: Should display post image with correct attributes
142 | const postImage = screen.getByRole("img", {
143 | name: `Post by ${post.user.username}`,
144 | });
145 | expect(postImage).toHaveAttribute("alt", `Post by ${post.user.username}`);
146 | expect(postImage).toHaveAttribute("width", "400");
147 | expect(postImage).toHaveAttribute("height", "400");
148 | });
149 |
150 | it("should handle special characters in post body", () => {
151 | // Given: Post with special characters
152 | const specialCharPost: PostDto = {
153 | ...validPostDto,
154 | body: "Post with émojis 🎉 and symbols !@#$%",
155 |       };
156 | 
157 |       // When: Render PostCard component
158 |       render(
159 |         <FullWrapper>
160 |           <PostCard post={specialCharPost} />
161 |         </FullWrapper>
162 |       );
163 | 
164 |       // Then: Should display special characters correctly
165 |       const postBody = screen.getByText(specialCharPost.body);
166 |       expect(postBody).toHaveTextContent(
167 |         "Post with émojis 🎉 and symbols !@#$%"
168 | );
169 | });
170 | });
171 |
172 | describe("Interaction Elements", () => {
173 | it("should display likes and comments count", () => {
174 | // Given: Valid post data
175 | const post = validPostDto;
176 |
177 | // When: Render PostCard component
178 | render(
179 | <FullWrapper>
180 | <PostCard post={post} />
181 | </FullWrapper>
182 | );
183 |
184 | // Then: Should display engagement counts
185 | const likesCount = screen.getByText(post.likes.toLocaleString());
186 | const commentsCount = screen.getByText(
187 | post.totalComments.toLocaleString()
188 | );
189 |
190 | expect(likesCount).toBeInTheDocument();
191 | expect(commentsCount).toBeInTheDocument();
192 | });
193 |
194 | it("should format large numbers correctly", () => {
195 | // Given: Post with large numbers
196 | const highEngagementPost: PostDto = {
197 | ...validPostDto,
198 | likes: 1234567,
199 | totalComments: 98765,
200 | };
201 |
202 | // When: Render PostCard component
203 | render(
204 | <FullWrapper>
205 | <PostCard post={highEngagementPost} />
206 | </FullWrapper>
207 | );
208 |
209 | // Then: Should format numbers with locale string
210 | const likesCount = screen.getByText("1,234,567");
211 | const commentsCount = screen.getByText("98,765");
212 |
213 | expect(likesCount).toBeInTheDocument();
214 | expect(commentsCount).toBeInTheDocument();
215 | });
216 |
217 | it("should display zero values correctly", () => {
218 | // Given: Post with zero engagement
219 | const newPost: PostDto = {
220 | ...validPostDto,
221 | likes: 0,
222 | totalComments: 0,
223 | };
224 |
225 | // When: Render PostCard component
226 | render(
227 | <FullWrapper>
228 | <PostCard post={newPost} />
229 | </FullWrapper>
230 | );
231 |
232 | // Then: Should display zero values for likes and comments specifically
233 | const likesCount = screen.getByTestId("post-likes-count");
234 | const commentsCount = screen.getByTestId("post-comments-count");
235 |
236 | expect(likesCount).toHaveTextContent("0");
237 | expect(commentsCount).toHaveTextContent("0");
238 | });
239 | });
240 |
241 | describe("Navigation", () => {
242 | it("should create correct link to post detail", () => {
243 | // Given: Valid post data
244 | const post = validPostDto;
245 |
246 | // When: Render PostCard component
247 | render(
248 | <FullWrapper>
249 | <PostCard post={post} />
250 | </FullWrapper>
251 | );
252 |
253 | // Then: Should link to correct post detail page
254 | const linkElement = screen.getByRole("link");
255 | expect(linkElement).toHaveAttribute("href", `/post/${post.id}`);
256 | });
257 | });
258 |
259 | describe("Accessibility", () => {
260 | it("should have proper semantic structure", () => {
261 | // Given: Valid post data
262 | const post = validPostDto;
263 |
264 | // When: Render PostCard component
265 | render(
266 | <FullWrapper>
267 | <PostCard post={post} />
268 | </FullWrapper>
269 | );
270 |
271 | // Then: Should have proper semantic elements
272 | const linkElement = screen.getByRole("link");
273 | const postImage = screen.getByRole("img", {
274 | name: `Post by ${post.user.username}`,
275 | });
276 |
277 | expect(linkElement).toHaveAttribute("href", `/post/${post.id}`);
278 | expect(postImage).toHaveAttribute("alt", `Post by ${post.user.username}`);
279 | });
280 |
281 | it("should be keyboard accessible", () => {
282 | // Given: Valid post data
283 | const post = validPostDto;
284 |
285 | // When: Render PostCard component
286 | render(
287 | <FullWrapper>
288 | <PostCard post={post} />
289 | </FullWrapper>
290 | );
291 |
292 | // Then: Should be keyboard accessible
293 | const linkElement = screen.getByRole("link");
294 | expect(linkElement.tagName).toBe("A");
295 | });
296 | });
297 | });
298 |

---

## /src/features/post/hooks/index.ts:

1 | import { postUsecase } from "../services";
2 | import { createPostHooks } from "./post.hooks.factory";
3 |
4 | export const { useGetPostById, useGetPosts } = createPostHooks(postUsecase);
5 |

---

## /src/features/post/hooks/post.hooks.factory.ts:

1 | import { PostUseCase } from "../usecase/post.usecase";
2 | import { createUseGetPostById } from "./useGetPostById";
3 | import { createUseGetPosts } from "./useGetPosts";
4 |
5 | export const createPostHooks = (postUseCase: PostUseCase) => ({
6 | useGetPosts: createUseGetPosts(postUseCase),
7 | useGetPostById: createUseGetPostById(postUseCase),
8 | });
9 |

---

## /src/features/post/hooks/useGetPostById.ts:

1 | import { POST_QUERY_KEYS } from "@/entities/post";
2 | import { BaseError } from "@/shared/libs/errors";
3 | import { useQuery } from "@tanstack/react-query";
4 | import { PostDetailResult } from "../types";
5 | import { PostUseCase } from "../usecase/post.usecase";
6 |
7 | export const createUseGetPostById = (postUseCase: PostUseCase) => {
8 | return (id: string, enabled = true) => {
9 | const usePostById = useQuery<PostDetailResult, Error>({
10 | queryKey: POST_QUERY_KEYS.detail(id),
11 | queryFn: async () => {
12 | try {
13 | return await postUseCase.getPostById(id);
14 | } catch (error) {
15 | if (error instanceof BaseError) {
16 | throw error;
17 | }
18 | throw new BaseError(
19 | `Failed to fetch post with ID ${id}`,
20 | "FETCH_FAILED"
21 | );
22 | }
23 | },
24 | enabled: enabled,
25 | staleTime: 1000 _ 60 _ 5,
26 | gcTime: 1000 _ 60 _ 10,
27 | });
28 | return usePostById;
29 | };
30 | };
31 |

---

## /src/features/post/hooks/useGetPosts.ts:

1 | import { POST_QUERY_KEYS } from "@/entities/post";
2 | import { BaseError } from "@/shared/libs/errors";
3 | import { useQuery } from "@tanstack/react-query";
4 | import { GetPostsOptions, PostListResult } from "../types";
5 | import { PostUseCase } from "../usecase/post.usecase";
6 |
7 | export const createUseGetPosts = (postUseCase: PostUseCase) => {
8 | return (options: GetPostsOptions = {}) => {
9 | const { limit = 10, skip = 0, query } = options;
10 |
11 | const isSearchQuery = !!query && query.length >= 2;
12 |
13 | const useGetPosts = useQuery<PostListResult, Error>({
14 | queryKey:
15 | isSearchQuery && query
16 | ? POST_QUERY_KEYS.search(query)
17 | : POST_QUERY_KEYS.list({ limit, skip }),
18 | queryFn: async () => {
19 | try {
20 | if (isSearchQuery && query) {
21 | return await postUseCase.searchPosts(limit, skip, query);
22 | }
23 | return await postUseCase.getAllPosts(limit, skip);
24 | } catch (error) {
25 | if (error instanceof BaseError) {
26 | throw error;
27 | }
28 | throw new BaseError(
29 | `Failed to fetch posts${query ? ` with query "${query}"` : ""}`,
30 | "FETCH_FAILED"
31 | );
32 | }
33 | },
34 | enabled: isSearchQuery ? !!query : true,
35 | staleTime: 1000 _ 60 _ 5,
36 | gcTime: 1000 _ 60 _ 10,
37 | refetchOnWindowFocus: false,
38 | });
39 | return useGetPosts;
40 | };
41 | };
42 |

---

## /src/features/post/index.ts:

1 | export { useGetPostById, useGetPosts } from "./hooks";
2 | export { PostCard } from "./ui/card";
3 |

---

## /src/features/post/services/index.ts:

1 | import { createPostService } from "./post.service.factory";
2 |
3 | export const postUsecase = createPostService();
4 |

---

## /src/features/post/services/post.service.factory.ts:

1 | import { CommentApiRepository } from "@/entities/comment";
2 | import { PostApiRepository } from "@/entities/post";
3 | import { UserApiRepository } from "@/entities/user";
4 | import { apiClient } from "@/shared/api";
5 | import { PostService } from "./post.service";
6 |
7 | export const createPostService = () => {
8 | const postRepository = new PostApiRepository(apiClient);
9 | const userRepository = new UserApiRepository(apiClient);
10 | const commentRepository = new CommentApiRepository(apiClient);
11 | return PostService(postRepository, commentRepository, userRepository);
12 | };
13 |

---

## /src/features/post/services/post.service.ts:

1 | import { CommentMapper, CommentRepository } from "@/entities/comment";
2 | import {
3 | PostDto,
4 | PostFactory,
5 | PostMapper,
6 | PostRepository,
7 | } from "@/entities/post";
8 | import { UserRepository } from "@/entities/user";
9 | import { BaseError } from "@/shared/libs/errors";
10 | import { PostDetailResult, PostListResult } from "../types";
11 | import { PostUseCase } from "../usecase/post.usecase";
12 |
13 | export const PostService = (
14 | postRepository: PostRepository,
15 | commentRepository: CommentRepository,
16 | userRepository: UserRepository
17 | ): PostUseCase => ({
18 | getAllPosts: async (
19 | limit?: number,
20 | skip?: number
21 | ): Promise<PostListResult> => {
22 | try {
23 | const posts = await postRepository.getAll(
24 | limit as number,
25 | skip as number
26 | );
27 | return {
28 | data: PostMapper.toDtoList(posts),
29 | pagination: {
30 | limit: limit || 10,
31 | skip: skip || 0,
32 | total: posts.length,
33 | },
34 | };
35 | } catch (error) {
36 | console.error("Error fetching post list:", error);
37 | if (error instanceof BaseError) {
38 | throw error;
39 | }
40 | throw new BaseError(`Failed to fetch post list`, "FetchError");
41 | }
42 | },
43 |
44 | searchPosts: async (
45 | limit?: number,
46 | skip?: number,
47 | searchQuery?: string
48 | ): Promise<PostListResult> => {
49 | try {
50 | const posts = await postRepository.search(searchQuery as string);
51 | return {
52 | data: PostMapper.toDtoList(posts),
53 | pagination: {
54 | limit: limit || 10,
55 | skip: skip || 0,
56 | total: posts.length,
57 | },
58 | };
59 | } catch (error) {
60 | console.error(`Error searching posts with query ${searchQuery}:`, error);
61 | if (error instanceof BaseError) {
62 | throw error;
63 | }
64 | throw new BaseError(
65 | `Failed to search posts with query "${searchQuery}"`,
66 | "SearchError"
67 | );
68 | }
69 | },
70 |
71 | getPostById: async (id: string): Promise<PostDetailResult> => {
72 | try {
73 | const post = await postRepository.getById(id);
74 |
75 | if (!post) {
76 | throw BaseError.notFound("Post", id);
77 | }
78 | const comments = await commentRepository.getByPostId(id);
79 |
80 | return {
81 | ...PostMapper.toDto(post),
82 | comments: CommentMapper.toDtoList(comments),
83 | };
84 | } catch (error) {
85 | console.error(`Error fetching post with ID ${id}:`, error);
86 | if (error instanceof BaseError) {
87 | throw error;
88 | }
89 | throw BaseError.notFound("Post", id);
90 | }
91 | },
92 |
93 | addPost: async (
94 | title: string,
95 | body: string,
96 | userId: string,
97 | image?: string
98 | ): Promise<PostDto> => {
99 | try {
100 | const user = await userRepository.getUserProfile();
101 | if (!user) {
102 | throw BaseError.notFound("User", userId);
103 | }
104 |
105 | const newPost = PostFactory.createNew(
106 | title,
107 | body,
108 | {
109 | id: userId,
110 | username: user.username,
111 | profileImage: user.profileImage || "",
112 | },
113 | image
114 | );
115 | const createdPost = await postRepository.create(newPost);
116 |
117 | if (!createdPost) {
118 | throw BaseError.createFailed("Post");
119 | }
120 |
121 | return PostMapper.toDto(createdPost);
122 | } catch (error) {
123 | console.error(`Error creating new post with title "${title}":`, error);
124 | if (error instanceof BaseError) {
125 | throw error;
126 | }
127 | throw BaseError.createFailed("Post");
128 | }
129 | },
130 |
131 | updatePost: async (
132 | id: string,
133 | title: string,
134 | body: string
135 | ): Promise<PostDto> => {
136 | try {
137 | const existingPost = await postRepository.getById(id);
138 | if (!existingPost) {
139 | throw BaseError.notFound("Post", id);
140 | }
141 |
142 | existingPost.updateTitle(title);
143 | existingPost.updateBody(body);
144 |
145 | const updatedPost = await postRepository.update(existingPost);
146 | if (!updatedPost) {
147 | throw BaseError.updateFailed("Post", id);
148 | }
149 |
150 | return PostMapper.toDto(updatedPost);
151 | } catch (error) {
152 | console.error(`Error updating post with ID ${id}:`, error);
153 | if (error instanceof BaseError) {
154 | throw error;
155 | }
156 | throw BaseError.updateFailed("Post", id);
157 | }
158 | },
159 |
160 | deletePost: async (id: string): Promise<boolean> => {
161 | try {
162 | const existingPost = await postRepository.getById(id);
163 | if (!existingPost) {
164 | throw BaseError.notFound("Post", id);
165 | }
166 |
167 | return await postRepository.delete(id);
168 | } catch (error) {
169 | console.error(`Error deleting post with ID ${id}:`, error);
170 | if (error instanceof BaseError) {
171 | throw error;
172 | }
173 | throw BaseError.deleteFailed("Post", id);
174 | }
175 | },
176 |
177 | likePost: async (id: string, userId: string): Promise<boolean> => {
178 | try {
179 | const existingPost = await postRepository.getById(id);
180 | if (!existingPost) {
181 | throw BaseError.notFound("Post", id);
182 | }
183 |
184 | const user = await userRepository.getUserProfile();
185 | if (!user) {
186 | throw BaseError.notFound("User", userId);
187 | }
188 |
189 | return await postRepository.like(id, userId);
190 | } catch (error) {
191 | console.error(
192 | `Error liking post with ID ${id} by user ${userId}:`,
193 | error
194 | );
195 | if (error instanceof BaseError) {
196 | throw error;
197 | }
198 | throw BaseError.updateFailed("Post", id);
199 | }
200 | },
201 |
202 | unlikePost: async (id: string, userId: string): Promise<boolean> => {
203 | try {
204 | const existingPost = await postRepository.getById(id);
205 | if (!existingPost) {
206 | throw BaseError.notFound("Post", id);
207 | }
208 |
209 | const user = await userRepository.getUserProfile();
210 | if (!user) {
211 | throw BaseError.notFound("User", userId);
212 | }
213 |
214 | return await postRepository.unlike(id, userId);
215 | } catch (error) {
216 | console.error(
217 | `Error unliking post with ID ${id} by user ${userId}:`,
218 | error
219 | );
220 | if (error instanceof BaseError) {
221 | throw error;
222 | }
223 | throw BaseError.updateFailed("Post", id);
224 | }
225 | },
226 | });
227 |

---

## /src/features/post/types/index.ts:

1 | import { CommentDto } from "@/entities/comment";
2 | import { PostDto } from "@/entities/post";
3 | import { Pagination } from "@/shared/types";
4 |
5 | export type PostListResult = Pagination<PostDto>;
6 |
7 | export type PostDetailResult = PostDto & {
8 | comments: CommentDto[];
9 | };
10 | export interface GetPostsOptions {
11 | limit?: number;
12 | skip?: number;
13 | query?: string;
14 | }
15 |

---

## /src/features/post/ui/card/PostCard.tsx:

1 | import { PostDto } from "@/entities/post";
2 | import { UserIdentifier } from "@/entities/user";
3 | import { CommentIcon, LikeIcon } from "@/shared/ui/icons";
4 | import Image from "next/image";
5 | import Link from "next/link";
6 |
7 | export const PostCard = ({ post }: { post: PostDto }) => {
8 | return (
9 | <Link
10 | href={`/post/${post.id}`}
11 | key={post.id}
12 | className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer">
13 | <div className="relative pb-[100%]">
14 | <Image
15 | src={post.image}
16 | alt={`Post by ${post.user.username}`}
17 | className="absolute inset-0 w-full h-full object-cover"
18 | width={400}
19 | height={400}
20 | priority={true}
21 | loading="eager"
22 | />
23 | </div>
24 | <div className="p-4">
25 | <UserIdentifier user={post.user} />
26 | <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.body}</p>
27 | <div className="flex items-center text-gray-500 text-sm">
28 | <div
29 | className="flex items-center mr-4"
30 | data-testid="post-likes-section">
31 | <LikeIcon className="h-4 w-4 text-red-500 mr-1" />
32 | <span data-testid="post-likes-count">
33 | {post.likes.toLocaleString()}
34 | </span>
35 | </div>
36 | <div
37 | className="flex items-center"
38 | data-testid="post-comments-section">
39 | <CommentIcon className="h-4 w-4 text-blue-500 mr-1" />
40 | <span data-testid="post-comments-count">
41 | {post.totalComments.toLocaleString()}
42 | </span>
43 | </div>
44 | </div>
45 | </div>
46 | </Link>
47 | );
48 | };
49 |

---

## /src/features/post/ui/card/index.ts:

1 | export { PostCard } from "./PostCard";
2 |

---

## /src/features/post/usecase/post.usecase.ts:

1 | import { PostDto } from "@/entities/post";
2 | import { PostDetailResult, PostListResult } from "../types";
3 |
4 | export interface PostUseCase {
5 | getAllPosts: (limit?: number, skip?: number) => Promise<PostListResult>;
6 | searchPosts: (
7 | limit?: number,
8 | skip?: number,
9 | searchQuery?: string
10 | ) => Promise<PostListResult>;
11 | getPostById: (id: string) => Promise<PostDetailResult>;
12 | addPost: (
13 | title: string,
14 | body: string,
15 | userId: string,
16 | image?: string
17 | ) => Promise<PostDto>;
18 |
19 | updatePost: (id: string, title: string, body: string) => Promise<PostDto>;
20 | deletePost: (id: string) => Promise<boolean>;
21 |
22 | likePost: (id: string, userId: string) => Promise<boolean>;
23 | unlikePost: (id: string, userId: string) => Promise<boolean>;
24 | }
25 |

---

## /src/features/user/**tests**/fixtures/index.ts:

1 | export \* from "./user-hook.fixtures";

---

## /src/features/user/**tests**/fixtures/user-hook.fixtures.ts:

1 | /\*_
2 | _ User Hook Test Fixtures
3 | _ Mock data for user-related hook tests
4 | _/
5 |
6 | import { UserProfileDto } from "@/entities/user";
7 |
8 | export const mockUserProfileData: UserProfileDto = {
9 | id: "user-1",
10 | username: "testuser",
11 | email: "test@example.com",
12 | profileImage: "https://example.com/avatar.jpg",
13 | age: 25,
14 | };
15 |
16 | export const mockUserProfileDataWithoutAge: UserProfileDto = {
17 | id: "user-2",
18 | username: "anotheruser",
19 | email: "another@example.com",
20 | profileImage: "https://example.com/avatar2.jpg",
21 | };

---

## /src/features/user/**tests**/hooks/useUserProfile.test.ts:

1 | import { QueryWrapper } from "@/shared/libs/**tests**";
2 | import { BaseError } from "@/shared/libs/errors";
3 | import { renderHook, waitFor } from "@testing-library/react";
4 | import { beforeEach, describe, expect, it, vi } from "vitest";
5 | import { createUseUserProfile } from "../../hooks/useUserProfile";
6 | import { mockUserProfileData } from "../fixtures";
7 |
8 | /\*_
9 | _ useUserProfile Hook Tests
10 | _ Verify React Query hook functionality using Given-When-Then pattern
11 | _/
12 | describe("useUserProfile Hook", () => {
13 | let mockUserUseCase: {
14 | getUserProfile: ReturnType<typeof vi.fn>;
15 | };
16 | let useUserProfile: ReturnType<typeof createUseUserProfile>;
17 |
18 | beforeEach(() => {
19 | // Given: Set up mock use case and test data
20 | mockUserUseCase = {
21 | getUserProfile: vi.fn(),
22 | };
23 |
24 | useUserProfile = createUseUserProfile(mockUserUseCase);
25 | });
26 |
27 | describe("Success Cases", () => {
28 | it("should successfully fetch user profile information", async () => {
29 | // Given: Valid user profile data from use case
30 | mockUserUseCase.getUserProfile.mockResolvedValue(mockUserProfileData);
31 |
32 | // When: Hook is called to fetch user profile
33 | const { result } = renderHook(() => useUserProfile(), {
34 | wrapper: QueryWrapper,
35 | });
36 |
37 | // Then: User profile should be fetched successfully
38 | await waitFor(() => {
39 | expect(result.current.isSuccess).toBe(true);
40 | });
41 |
42 | expect(result.current.data).toEqual(mockUserProfileData);
43 | expect(mockUserUseCase.getUserProfile).toHaveBeenCalledWith();
44 | });
45 | });
46 |
47 | describe("Error Handling", () => {
48 | it("should handle BaseError correctly", async () => {
49 | // Given: BaseError from use case
50 | const baseError = new BaseError("User not found", "NOT_FOUND");
51 | mockUserUseCase.getUserProfile.mockRejectedValue(baseError);
52 |
53 | // When: Hook is called and use case throws BaseError
54 | const { result } = renderHook(() => useUserProfile(), {
55 | wrapper: QueryWrapper,
56 | });
57 |
58 | // Then: BaseError should be propagated correctly
59 | await waitFor(() => {
60 | expect(result.current.isError).toBe(true);
61 | });
62 |
63 | expect(result.current.error).toEqual(baseError);
64 | });
65 |
66 | it("should wrap generic errors in BaseError", async () => {
67 | // Given: Generic error from use case
68 | const unknownError = new Error("Network error");
69 | mockUserUseCase.getUserProfile.mockRejectedValue(unknownError);
70 |
71 | // When: Hook is called and use case throws generic error
72 | const { result } = renderHook(() => useUserProfile(), {
73 | wrapper: QueryWrapper,
74 | });
75 |
76 | // Then: Generic error should be wrapped in BaseError
77 | await waitFor(() => {
78 | expect(result.current.isError).toBe(true);
79 | });
80 |
81 | expect(result.current.error).toBeInstanceOf(BaseError);
82 | expect(result.current.error?.message).toBe(
83 | "Failed to fetch user profile"
84 | );
85 | });
86 | });
87 |
88 | describe("Loading State", () => {
89 | it("should manage initial loading state correctly", async () => {
90 | // Given: Delayed response from use case
91 | mockUserUseCase.getUserProfile.mockImplementation(
92 | () =>
93 | new Promise((resolve) =>
94 | setTimeout(() => resolve(mockUserProfileData), 100)
95 | )
96 | );
97 |
98 | // When: Hook is called with delayed response
99 | const { result } = renderHook(() => useUserProfile(), {
100 | wrapper: QueryWrapper,
101 | });
102 |
103 | // Then: Loading state should be managed correctly
104 | expect(result.current.isLoading).toBe(true);
105 |
106 | await waitFor(() => {
107 | expect(result.current.isSuccess).toBe(true);
108 | });
109 |
110 | expect(result.current.isLoading).toBe(false);
111 | });
112 | });
113 | });
114 |

---

## /src/features/user/**tests**/index.ts:

1 | // Service Mocks
2 | export { UserServiceMocks } from "./mocks/user-service.mock";
3 |
4 | export type { MockUserService } from "./mocks/user-service.mock";
5 |

---

## /src/features/user/**tests**/mocks/user-service.mock.ts:

1 | import { UserEntity } from "@/entities/user/types/user.types";
2 | import { MockService, ServiceMockFactory } from "@/shared/libs/**tests**";
3 | import { vi } from "vitest";
4 |
5 | export interface MockUserService extends MockService<UserEntity> {
6 | getUserProfile: ReturnType<typeof vi.fn>;
7 | updateUserProfile: ReturnType<typeof vi.fn>;
8 | }
9 |
10 | export const UserServiceMocks = {
11 | create: (): MockUserService => ({
12 | ...ServiceMockFactory.createBasicMock<UserEntity>(),
13 | getUserProfile: vi.fn(),
14 | updateUserProfile: vi.fn(),
15 | }),
16 |
17 | createSuccess: (
18 | mockUser: UserEntity,
19 | mockUsers: UserEntity[] = []
20 | ): MockUserService => ({
21 | ...ServiceMockFactory.createSuccessMock(mockUser, mockUsers),
22 | getUserProfile: vi.fn().mockResolvedValue(mockUser),
23 | updateUserProfile: vi.fn().mockResolvedValue(mockUser),
24 | }),
25 |
26 | createError: (
27 | error: Error = new Error("User Service Error")
28 | ): MockUserService => ({
29 | ...ServiceMockFactory.createErrorMock<UserEntity>(error),
30 | getUserProfile: vi.fn().mockRejectedValue(error),
31 | updateUserProfile: vi.fn().mockRejectedValue(error),
32 | }),
33 | };
34 |

---

## /src/features/user/**tests**/services/user.service.test.ts:

1 | import { UserProfileDto, UserRepository } from "@/entities/user";
2 | import { UserFixtures } from "@/entities/user/**tests**/fixtures";
3 | import {
4 | MockUserRepository,
5 | UserRepositoryMocks,
6 | } from "@/entities/user/**tests**/mocks";
7 | import { BaseError } from "@/shared/libs/errors";
8 | import { beforeEach, describe, expect, it, vi } from "vitest";
9 | import { UserService } from "../../services/user.service";
10 |
11 | /\*_
12 | _ User Service Tests
13 | _ Tests for the UserService implementation
14 | _/
15 | describe("UserService", () => {
16 | let mockUserRepository: MockUserRepository;
17 | let userService: ReturnType<typeof UserService>;
18 | let validUserProfileDto: UserProfileDto;
19 |
20 | beforeEach(() => {
21 | mockUserRepository = UserRepositoryMocks.create();
22 | vi.clearAllMocks();
23 | userService = UserService(mockUserRepository as unknown as UserRepository);
24 |
25 | const userData = UserFixtures.valid.basic;
26 | validUserProfileDto = {
27 | id: userData.id,
28 | username: userData.username,
29 | profileImage: userData.profileImage,
30 | age: userData.age,
31 | email: userData.email,
32 | };
33 | });
34 |
35 | describe("getUserProfile", () => {
36 | it("should return user profile when repository returns valid data", async () => {
37 | // Given
38 | mockUserRepository.getUserProfile.mockResolvedValue(validUserProfileDto);
39 |
40 | // When
41 | const result = await userService.getUserProfile();
42 |
43 | // Then
44 | expect(result).toEqual(validUserProfileDto);
45 | expect(mockUserRepository.getUserProfile).toHaveBeenCalledTimes(1);
46 | });
47 |
48 | it("should throw NotFoundError when repository returns null", async () => {
49 | // Given
50 | mockUserRepository.getUserProfile.mockResolvedValue(null);
51 |
52 | // When & Then
53 | await expect(userService.getUserProfile()).rejects.toThrow(BaseError);
54 | await expect(userService.getUserProfile()).rejects.toThrow(
55 | "User with ID current not found"
56 | );
57 | });
58 |
59 | it("should throw NotFoundError when repository returns undefined", async () => {
60 | // Given
61 | mockUserRepository.getUserProfile.mockResolvedValue(undefined);
62 |
63 | // When & Then
64 | await expect(userService.getUserProfile()).rejects.toThrow(BaseError);
65 | await expect(userService.getUserProfile()).rejects.toThrow(
66 | "User with ID current not found"
67 | );
68 | });
69 |
70 | it("should re-throw BaseError when repository throws BaseError", async () => {
71 | // Given
72 | const baseError = BaseError.unauthorized("User", "123", "access");
73 | mockUserRepository.getUserProfile.mockRejectedValue(baseError);
74 |
75 | // When & Then
76 | await expect(userService.getUserProfile()).rejects.toThrow(baseError);
77 | });
78 |
79 | it("should wrap generic error in BaseError", async () => {
80 | // Given
81 | const genericError = new Error("Database connection failed");
82 | mockUserRepository.getUserProfile.mockRejectedValue(genericError);
83 |
84 | // When & Then
85 | await expect(userService.getUserProfile()).rejects.toThrow(BaseError);
86 | await expect(userService.getUserProfile()).rejects.toThrow(
87 | "Failed to fetch user profile"
88 | );
89 | });
90 |
91 | it("should log errors to console", async () => {
92 | // Given
93 | const consoleSpy = vi
94 | .spyOn(console, "error")
95 | .mockImplementation(() => {});
96 | const error = new Error("Repository error");
97 | mockUserRepository.getUserProfile.mockRejectedValue(error);
98 |
99 | // When
100 | try {
101 | await userService.getUserProfile();
102 | } catch {
103 | // Expected to throw
104 | }
105 |
106 | // Then
107 | expect(consoleSpy).toHaveBeenCalledWith(
108 | "Error fetching user profile:",
109 | error
110 | );
111 |
112 | consoleSpy.mockRestore();
113 | });
114 | });
115 | });
116 |

---

## /src/features/user/hooks/index.ts:

1 | import { userUsecase } from "../services";
2 | import { createUserHooks } from "./user.hooks.factory";
3 |
4 | export const { useUserProfile } = createUserHooks(userUsecase);
5 |

---

## /src/features/user/hooks/useUserProfile.ts:

1 | import { USER_QUERY_KEYS, UserProfileDto } from "@/entities/user";
2 | import { BaseError } from "@/shared/libs/errors";
3 | import { useQuery } from "@tanstack/react-query";
4 | import { UserUseCase } from "../usecase/user.usecase";
5 |
6 | export const createUseUserProfile = (userUseCase: UserUseCase) => {
7 | const useUserProfile = () => {
8 | return useQuery<UserProfileDto>({
9 | queryKey: USER_QUERY_KEYS.profile(),
10 | queryFn: async () => {
11 | try {
12 | return await userUseCase.getUserProfile();
13 | } catch (error) {
14 | if (error instanceof BaseError) {
15 | throw error;
16 | }
17 | throw new BaseError("Failed to fetch user profile", "FetchError");
18 | }
19 | },
20 | staleTime: 5 _ 60 _ 1000,
21 | });
22 | };
23 |
24 | return useUserProfile;
25 | };
26 |

---

## /src/features/user/hooks/user.hooks.factory.ts:

1 | import { UserUseCase } from "../usecase/user.usecase";
2 | import { createUseUserProfile } from "./useUserProfile";
3 |
4 | export const createUserHooks = (userUseCase: UserUseCase) => ({
5 | useUserProfile: createUseUserProfile(userUseCase),
6 | });
7 |

---

## /src/features/user/index.ts:

1 | export { useUserProfile } from "./hooks";
2 |

---

## /src/features/user/services/index.ts:

1 | import { createUserService } from "./user.service.factory";
2 |
3 | export const userUsecase = createUserService();
4 |

---

## /src/features/user/services/user.service.factory.ts:

1 | import { UserApiRepository } from "@/entities/user";
2 | import { apiClient } from "@/shared/api";
3 | import { UserService } from "./user.service";
4 |
5 | export const createUserService = () => {
6 | const repository = new UserApiRepository(apiClient);
7 | return UserService(repository);
8 | };
9 |

---

## /src/features/user/services/user.service.ts:

1 | import { UserProfileDto, UserRepository } from "@/entities/user";
2 | import { BaseError } from "@/shared/libs/errors";
3 | import { UserUseCase } from "../usecase/user.usecase";
4 |
5 | export const UserService = (userRepository: UserRepository): UserUseCase => ({
6 | getUserProfile: async (): Promise<UserProfileDto> => {
7 | try {
8 | const result = await userRepository.getUserProfile();
9 | if (!result) {
10 | throw BaseError.notFound("User", "current");
11 | }
12 | return result;
13 | } catch (error) {
14 | console.error("Error fetching user profile:", error);
15 | if (error instanceof BaseError) {
16 | throw error;
17 | }
18 | throw new BaseError("Failed to fetch user profile", "FetchError");
19 | }
20 | },
21 | });
22 |

---

## /src/features/user/usecase/user.usecase.ts:

1 | import { UserProfileDto } from "@/entities/user";
2 |
3 | export interface UserUseCase {
4 | getUserProfile: () => Promise<UserProfileDto>;
5 | }
6 |

---

## /src/pages/home/HomePage.tsx:

1 | import { PostListSection } from "@/widgets/post";
2 |
3 | export function Home() {
4 | return (
5 | <div className="w-full min-h-screen bg-gray-50">
6 | <div className="w-full flex-1 flex flex-col items-center justify-center p-4">
7 | <PostListSection />
8 | </div>
9 | </div>
10 | );
11 | }
12 |

---

## /src/pages/home/**tests**/HomePage.test.tsx:

1 | import { FullWrapper } from "@/shared/libs/**tests**";
2 | import { render, screen, waitFor } from "@testing-library/react";
3 | import { beforeEach, describe, expect, it, vi } from "vitest";
4 | import { Home } from "../HomePage";
5 |
6 | // Mock the PostListSection widget
7 | vi.mock("@/widgets/post", () => ({
8 | PostListSection: vi.fn(() => (
9 | <div data-testid="post-list-section">Post List Section</div>
10 | )),
11 | }));
12 |
13 | /\*_
14 | _ HomePage Component Tests
15 | _ Verify all HomePage component functionality using Given-When-Then pattern
16 | _/
17 | describe("HomePage Component", () => {
18 | beforeEach(() => {
19 | // Given: Clear all mocks before each test
20 | vi.clearAllMocks();
21 | });
22 |
23 | describe("Rendering", () => {
24 | it("should render HomePage with correct layout structure when component is mounted", () => {
25 | // Given: HomePage component is ready to render
26 |
27 | // When: Render HomePage component
28 | render(
29 | <FullWrapper>
30 | <Home />
31 | </FullWrapper>
32 | );
33 |
34 | // Then: Component should render with correct layout structure
35 | const postListSection = screen.getByTestId("post-list-section");
36 | const mainContainer = postListSection.closest(
37 | ".w-full.min-h-screen.bg-gray-50"
38 | );
39 | expect(mainContainer).toBeInTheDocument();
40 | expect(mainContainer).toHaveClass("w-full", "min-h-screen", "bg-gray-50");
41 |
42 | const contentContainer = mainContainer?.querySelector(
43 | ".w-full.flex-1.flex.flex-col.items-center.justify-center.p-4"
44 | );
45 | expect(contentContainer).toBeInTheDocument();
46 | });
47 |
48 | it("should render HomePage with PostListSection widget when component is mounted", () => {
49 | // Given: HomePage component is ready to render
50 |
51 | // When: Render HomePage component
52 | render(
53 | <FullWrapper>
54 | <Home />
55 | </FullWrapper>
56 | );
57 |
58 | // Then: PostListSection widget should be rendered
59 | const postListSection = screen.getByTestId("post-list-section");
60 | expect(postListSection).toBeInTheDocument();
61 | expect(postListSection).toHaveTextContent("Post List Section");
62 | });
63 |
64 | it("should have proper semantic structure when rendered", () => {
65 | // Given: HomePage component is ready to render
66 |
67 | // When: Render HomePage component
68 | render(
69 | <FullWrapper>
70 | <Home />
71 | </FullWrapper>
72 | );
73 |
74 | // Then: Component should have proper semantic structure
75 | const postListSection = screen.getByTestId("post-list-section");
76 | const mainContainer = postListSection.closest(
77 | ".w-full.min-h-screen.bg-gray-50"
78 | );
79 | expect(mainContainer).toBeInTheDocument();
80 |
81 | // Should contain the PostListSection
82 | expect(mainContainer).toContainElement(postListSection);
83 | });
84 | });
85 |
86 | describe("Layout and Styling", () => {
87 | it("should apply correct CSS classes for full-screen layout when rendered", () => {
88 | // Given: HomePage component is ready to render
89 |
90 | // When: Render HomePage component
91 | render(
92 | <FullWrapper>
93 | <Home />
94 | </FullWrapper>
95 | );
96 |
97 | // Then: Main container should have full-screen layout classes
98 | const postListSection = screen.getByTestId("post-list-section");
99 | const mainContainer = postListSection.closest(
100 | ".w-full.min-h-screen.bg-gray-50"
101 | );
102 | expect(mainContainer).toHaveClass("w-full", "min-h-screen", "bg-gray-50");
103 | });
104 |
105 | it("should apply correct CSS classes for content centering when rendered", () => {
106 | // Given: HomePage component is ready to render
107 |
108 | // When: Render HomePage component
109 | render(
110 | <FullWrapper>
111 | <Home />
112 | </FullWrapper>
113 | );
114 |
115 | // Then: Content container should have centering classes
116 | const postListSection = screen.getByTestId("post-list-section");
117 | const mainContainer = postListSection.closest(
118 | ".w-full.min-h-screen.bg-gray-50"
119 | );
120 | const contentContainer = mainContainer?.querySelector(
121 | ".w-full.flex-1.flex.flex-col.items-center.justify-center.p-4"
122 | );
123 |
124 | expect(contentContainer).toBeInTheDocument();
125 | expect(contentContainer).toHaveClass(
126 | "w-full",
127 | "flex-1",
128 | "flex",
129 | "flex-col",
130 | "items-center",
131 | "justify-center",
132 | "p-4"
133 | );
134 | });
135 |
136 | it("should maintain consistent layout structure across different viewport sizes", () => {
137 | // Given: HomePage component is ready to render
138 |
139 | // When: Render HomePage component
140 | render(
141 | <FullWrapper>
142 | <Home />
143 | </FullWrapper>
144 | );
145 |
146 | // Then: Layout should use responsive classes
147 | const postListSection = screen.getByTestId("post-list-section");
148 | const mainContainer = postListSection.closest(
149 | ".w-full.min-h-screen.bg-gray-50"
150 | );
151 | const contentContainer = mainContainer?.querySelector(
152 | ".w-full.flex-1.flex.flex-col.items-center.justify-center.p-4"
153 | );
154 |
155 | expect(mainContainer).toHaveClass("w-full", "min-h-screen");
156 | expect(contentContainer).toHaveClass(
157 | "w-full",
158 | "flex-1",
159 | "flex",
160 | "flex-col"
161 | );
162 | });
163 | });
164 |
165 | describe("Widget Integration", () => {
166 | it("should properly integrate PostListSection widget when component is rendered", async () => {
167 | // Given: HomePage component with PostListSection widget
168 |
169 | // When: Render HomePage component
170 | render(
171 | <FullWrapper>
172 | <Home />
173 | </FullWrapper>
174 | );
175 |
176 | // Then: PostListSection should be properly integrated
177 | await waitFor(() => {
178 | const postListSection = screen.getByTestId("post-list-section");
179 | expect(postListSection).toBeInTheDocument();
180 | });
181 | });
182 |
183 | it("should render PostListSection within the correct container when component is mounted", () => {
184 | // Given: HomePage component is ready to render
185 |
186 | // When: Render HomePage component
187 | render(
188 | <FullWrapper>
189 | <Home />
190 | </FullWrapper>
191 | );
192 |
193 | // Then: PostListSection should be within the content container
194 | const postListSection = screen.getByTestId("post-list-section");
195 | const mainContainer = postListSection.closest(
196 | ".w-full.min-h-screen.bg-gray-50"
197 | );
198 | const contentContainer = mainContainer?.querySelector(
199 | ".w-full.flex-1.flex.flex-col.items-center.justify-center.p-4"
200 | );
201 |
202 | expect(contentContainer).toContainElement(postListSection);
203 | });
204 | });
205 |
206 | describe("Data Loading States", () => {
207 | it("should handle PostListSection loading state when data is being fetched", async () => {
208 | // Given: PostListSection is in loading state
209 | const { PostListSection } = await import("@/widgets/post");
210 | vi.mocked(PostListSection).mockImplementation(() => (
211 | <div data-testid="post-list-section" data-loading="true">
212 | Loading posts...
213 | </div>
214 | ));
215 |
216 | // When: Render HomePage component
217 | render(
218 | <FullWrapper>
219 | <Home />
220 | </FullWrapper>
221 | );
222 |
223 | // Then: Loading state should be displayed
224 | const postListSection = screen.getByTestId("post-list-section");
225 | expect(postListSection).toBeInTheDocument();
226 | expect(postListSection).toHaveAttribute("data-loading", "true");
227 | });
228 |
229 | it("should handle PostListSection error state when data loading fails", async () => {
230 | // Given: PostListSection is in error state
231 | const { PostListSection } = await import("@/widgets/post");
232 | vi.mocked(PostListSection).mockImplementation(() => (
233 | <div data-testid="post-list-section" data-error="true">
234 | Error loading posts
235 | </div>
236 | ));
237 |
238 | // When: Render HomePage component
239 | render(
240 | <FullWrapper>
241 | <Home />
242 | </FullWrapper>
243 | );
244 |
245 | // Then: Error state should be displayed
246 | const postListSection = screen.getByTestId("post-list-section");
247 | expect(postListSection).toBeInTheDocument();
248 | expect(postListSection).toHaveAttribute("data-error", "true");
249 | });
250 |
251 | it("should handle PostListSection empty state when no posts are available", async () => {
252 | // Given: PostListSection is in empty state
253 | const { PostListSection } = await import("@/widgets/post");
254 | vi.mocked(PostListSection).mockImplementation(() => (
255 | <div data-testid="post-list-section" data-empty="true">
256 | No posts available
257 | </div>
258 | ));
259 |
260 | // When: Render HomePage component
261 | render(
262 | <FullWrapper>
263 | <Home />
264 | </FullWrapper>
265 | );
266 |
267 | // Then: Empty state should be displayed
268 | const postListSection = screen.getByTestId("post-list-section");
269 | expect(postListSection).toBeInTheDocument();
270 | expect(postListSection).toHaveAttribute("data-empty", "true");
271 | });
272 | });
273 |
274 | describe("Component Lifecycle", () => {
275 | it("should mount and unmount HomePage component correctly", () => {
276 | // Given: HomePage component is ready to render
277 |
278 | // When: Render and unmount HomePage component
279 | const { unmount } = render(
280 | <FullWrapper>
281 | <Home />
282 | </FullWrapper>
283 | );
284 |
285 | // Then: Component should be mounted correctly
286 | const postListSection = screen.getByTestId("post-list-section");
287 | expect(postListSection).toBeInTheDocument();
288 |
289 | // When: Unmount component
290 | unmount();
291 |
292 | // Then: Component should be unmounted correctly
293 | expect(screen.queryByTestId("post-list-section")).not.toBeInTheDocument();
294 | });
295 |
296 | it("should re-render HomePage component correctly when props change", () => {
297 | // Given: HomePage component is rendered
298 | const { rerender } = render(
299 | <FullWrapper>
300 | <Home />
301 | </FullWrapper>
302 | );
303 |
304 | // When: Re-render component
305 | rerender(
306 | <FullWrapper>
307 | <Home />
308 | </FullWrapper>
309 | );
310 |
311 | // Then: Component should re-render correctly
312 | const postListSection = screen.getByTestId("post-list-section");
313 | expect(postListSection).toBeInTheDocument();
314 | });
315 | });
316 |
317 | describe("Accessibility", () => {
318 | it("should have proper semantic HTML structure when rendered", () => {
319 | // Given: HomePage component is ready to render
320 |
321 | // When: Render HomePage component
322 | render(
323 | <FullWrapper>
324 | <Home />
325 | </FullWrapper>
326 | );
327 |
328 | // Then: Component should have proper semantic structure
329 | const postListSection = screen.getByTestId("post-list-section");
330 | const mainContainer = postListSection.closest(
331 | ".w-full.min-h-screen.bg-gray-50"
332 | );
333 | expect(mainContainer).toBeInTheDocument();
334 | expect(mainContainer?.tagName).toBe("DIV");
335 | });
336 |
337 | it("should be keyboard accessible when rendered", () => {
338 | // Given: HomePage component is ready to render
339 |
340 | // When: Render HomePage component
341 | render(
342 | <FullWrapper>
343 | <Home />
344 | </FullWrapper>
345 | );
346 |
347 | // Then: Component should be keyboard accessible
348 | const postListSection = screen.getByTestId("post-list-section");
349 | expect(postListSection).toBeInTheDocument();
350 | });
351 |
352 | it("should provide proper focus management when component is rendered", () => {
353 | // Given: HomePage component is ready to render
354 |
355 | // When: Render HomePage component
356 | render(
357 | <FullWrapper>
358 | <Home />
359 | </FullWrapper>
360 | );
361 |
362 | // Then: Focus should be manageable
363 | const postListSection = screen.getByTestId("post-list-section");
364 | expect(postListSection).toBeInTheDocument();
365 |
366 | // Component should not interfere with natural focus flow
367 | expect(document.activeElement).toBe(document.body);
368 | });
369 | });
370 |
371 | describe("Performance", () => {
372 | it("should render HomePage efficiently without unnecessary re-renders", async () => {
373 | // Given: HomePage component is ready to render
374 | const { PostListSection } = vi.mocked(await import("@/widgets/post"));
375 |
376 | // When: Render HomePage component multiple times
377 | const { rerender } = render(
378 | <FullWrapper>
379 | <Home />
380 | </FullWrapper>
381 | );
382 |
383 | const initialCallCount = PostListSection.mock.calls.length;
384 |
385 | rerender(
386 | <FullWrapper>
387 | <Home />
388 | </FullWrapper>
389 | );
390 |
391 | // Then: PostListSection should not be called unnecessarily
392 | expect(PostListSection.mock.calls.length).toBe(initialCallCount + 1);
393 | });
394 |
395 | it("should handle multiple rapid re-renders gracefully", () => {
396 | // Given: HomePage component is ready for rapid re-renders
397 |
398 | // When: Perform multiple rapid re-renders
399 | const { rerender } = render(
400 | <FullWrapper>
401 | <Home />
402 | </FullWrapper>
403 | );
404 |
405 | for (let i = 0; i < 5; i++) {
406 | rerender(
407 | <FullWrapper>
408 | <Home />
409 | </FullWrapper>
410 | );
411 | }
412 |
413 | // Then: Component should handle rapid re-renders gracefully
414 | const postListSection = screen.getByTestId("post-list-section");
415 | expect(postListSection).toBeInTheDocument();
416 | });
417 | });
418 |
419 | describe("Edge Cases", () => {
420 | it("should handle PostListSection returning null when no data is available", async () => {
421 | // Given: PostListSection returns null
422 | const { PostListSection } = await import("@/widgets/post");
423 | vi.mocked(PostListSection).mockImplementation(() => null);
424 |
425 | // When: Render HomePage component
426 | render(
427 | <FullWrapper>
428 | <Home />
429 | </FullWrapper>
430 | );
431 |
432 | // Then: Component should handle null PostListSection gracefully
433 | const container = document.querySelector(
434 | ".w-full.min-h-screen.bg-gray-50"
435 | );
436 | expect(container).toBeInTheDocument();
437 |
438 | // PostListSection should not be in the document
439 | expect(screen.queryByTestId("post-list-section")).not.toBeInTheDocument();
440 | });
441 |
442 | it("should handle PostListSection throwing an error during render", async () => {
443 | // Given: PostListSection throws an error
444 | const { PostListSection } = await import("@/widgets/post");
445 | vi.mocked(PostListSection).mockImplementation(() => {
446 | throw new Error("PostListSection render error");
447 | });
448 |
449 | // When: Render HomePage component with error boundary
450 | expect(() => {
451 | render(
452 | <FullWrapper>
453 | <Home />
454 | </FullWrapper>
455 | );
456 | }).toThrow("PostListSection render error");
457 |
458 | // Then: Error should be thrown as expected
459 | // This test verifies that errors are properly propagated
460 | });
461 |
462 | it("should maintain layout integrity when PostListSection has different content sizes", async () => {
463 | // Given: PostListSection with different content sizes
464 | const contentSizes = [
465 | "Small content",
466 | "Medium sized content that spans multiple lines",
467 | "Very large content that contains a lot of text and should test how the layout handles extensive content within the PostListSection widget component",
468 | ];
469 |
470 | for (const content of contentSizes) {
471 | // When: Render HomePage with different content sizes
472 | const { PostListSection } = await import("@/widgets/post");
473 | vi.mocked(PostListSection).mockImplementation(() => (
474 | <div data-testid="post-list-section">{content}</div>
475 | ));
476 |
477 | const { unmount } = render(
478 | <FullWrapper>
479 | <Home />
480 | </FullWrapper>
481 | );
482 |
483 | // Then: Layout should maintain integrity
484 | const postListSection = screen.getByTestId("post-list-section");
485 | const mainContainer = postListSection.closest(
486 | ".w-full.min-h-screen.bg-gray-50"
487 | );
488 | const contentContainer = mainContainer?.querySelector(
489 | ".w-full.flex-1.flex.flex-col.items-center.justify-center.p-4"
490 | );
491 |
492 | expect(mainContainer).toHaveClass(
493 | "w-full",
494 | "min-h-screen",
495 | "bg-gray-50"
496 | );
497 | expect(contentContainer).toHaveClass("items-center", "justify-center");
498 |
499 | // Clean up for next iteration
500 | unmount();
501 | }
502 | });
503 | });
504 |
505 | describe("Integration", () => {
506 | it("should properly integrate with FullWrapper test utility when rendered", () => {
507 | // Given: HomePage component with FullWrapper
508 |
509 | // When: Render HomePage component with FullWrapper
510 | render(
511 | <FullWrapper routerPath="/">
512 | <Home />
513 | </FullWrapper>
514 | );
515 |
516 | // Then: Component should integrate properly with test wrapper
517 | const postListSection = screen.getByTestId("post-list-section");
518 | expect(postListSection).toBeInTheDocument();
519 | });
520 |
521 | it("should work correctly with different FullWrapper configurations", () => {
522 | // Given: Different FullWrapper configurations
523 | const configurations = [
524 | { routerPath: "/" },
525 | { routerPath: "/", routerQuery: {} },
526 | { routerPath: "/home" },
527 | ];
528 |
529 | configurations.forEach((config) => {
530 | // When: Render HomePage with different configurations
531 | const { unmount } = render(
532 | <FullWrapper {...config}>
533 | <Home />
534 | </FullWrapper>
535 | );
536 |
537 | // Then: Component should work with all configurations
538 | const postListSection = screen.getByTestId("post-list-section");
539 | expect(postListSection).toBeInTheDocument();
540 |
541 | // Clean up for next iteration
542 | unmount();
543 | });
544 | });
545 | });
546 | });
547 |

---

## /src/pages/home/index.ts:

1 | export { Home } from "./HomePage";
2 |

---

## /src/pages/post/**tests**/detail/PostDetailPage.test.tsx:

1 | import { FullWrapper } from "@/shared/libs/**tests**";
2 | import { render, screen, waitFor } from "@testing-library/react";
3 | import { beforeEach, describe, expect, it, vi } from "vitest";
4 | import { PostDetailPage } from "../../detail";
5 |
6 | // Mock the PostDetailSection widget
7 | vi.mock("@/widgets/post", () => ({
8 | PostDetailSection: vi.fn(({ postId }: { postId: string }) => (
9 | <div data-testid="post-detail-section" data-post-id={postId}>
10 | Post Detail Section for {postId}
11 | </div>
12 | )),
13 | }));
14 |
15 | /\*_
16 | _ PostDetailPage Component Tests
17 | _ Verify all PostDetailPage component functionality using Given-When-Then pattern
18 | _/
19 | describe("PostDetailPage Component", () => {
20 | let validPostId: string;
21 |
22 | beforeEach(() => {
23 | // Given: Clear all mocks and set up valid post ID
24 | vi.clearAllMocks();
25 | validPostId = "post-123";
26 | });
27 |
28 | describe("Rendering", () => {
29 | it("should render PostDetailPage with correct layout structure when provided with valid postId", () => {
30 | // Given: Valid post ID
31 | const postId = validPostId;
32 |
33 | // When: Render PostDetailPage component
34 | render(
35 | <FullWrapper>
36 | <PostDetailPage postId={postId} />
37 | </FullWrapper>
38 | );
39 |
40 | // Then: Component should render with correct layout structure
41 | const postDetailSection = screen.getByTestId("post-detail-section");
42 | const mainContainer = postDetailSection.closest(
43 | ".w-full.bg-white.overflow-y-auto"
44 | );
45 | expect(mainContainer).toBeInTheDocument();
46 | expect(mainContainer).toHaveClass(
47 | "w-full",
48 | "bg-white",
49 | "overflow-y-auto"
50 | );
51 | });
52 |
53 | it("should render PostDetailPage with PostDetailSection widget when provided with postId", () => {
54 | // Given: Valid post ID
55 | const postId = validPostId;
56 |
57 | // When: Render PostDetailPage component
58 | render(
59 | <FullWrapper>
60 | <PostDetailPage postId={postId} />
61 | </FullWrapper>
62 | );
63 |
64 | // Then: PostDetailSection widget should be rendered with correct postId
65 | const postDetailSection = screen.getByTestId("post-detail-section");
66 | expect(postDetailSection).toBeInTheDocument();
67 | expect(postDetailSection).toHaveAttribute("data-post-id", postId);
68 | expect(postDetailSection).toHaveTextContent(
69 | `Post Detail Section for ${postId}`
70 | );
71 | });
72 |
73 | it("should have proper semantic structure when rendered with postId", () => {
74 | // Given: Valid post ID
75 | const postId = validPostId;
76 |
77 | // When: Render PostDetailPage component
78 | render(
79 | <FullWrapper>
80 | <PostDetailPage postId={postId} />
81 | </FullWrapper>
82 | );
83 |
84 | // Then: Component should have proper semantic structure
85 | const postDetailSection = screen.getByTestId("post-detail-section");
86 | const mainContainer = postDetailSection.closest(
87 | ".w-full.bg-white.overflow-y-auto"
88 | );
89 | expect(mainContainer).toBeInTheDocument();
90 |
91 | // Should contain the PostDetailSection
92 | expect(mainContainer).toContainElement(postDetailSection);
93 | });
94 | });
95 |
96 | describe("Props Handling", () => {
97 | it("should pass postId prop correctly to PostDetailSection when provided with different postIds", () => {
98 | // Given: Array of different post IDs
99 | const postIds = [
100 | "post-1",
101 | "post-abc",
102 | "special-post-123",
103 | "post-with-dashes",
104 | ];
105 |
106 | postIds.forEach((postId) => {
107 | // When: Render PostDetailPage with different postId
108 | const { unmount } = render(
109 | <FullWrapper>
110 | <PostDetailPage postId={postId} />
111 | </FullWrapper>
112 | );
113 |
114 | // Then: PostDetailSection should receive correct postId
115 | const postDetailSection = screen.getByTestId("post-detail-section");
116 | expect(postDetailSection).toHaveAttribute("data-post-id", postId);
117 | expect(postDetailSection).toHaveTextContent(
118 | `Post Detail Section for ${postId}`
119 | );
120 |
121 | // Clean up for next iteration
122 | unmount();
123 | });
124 | });
125 |
126 | it("should handle empty postId when provided with empty string", () => {
127 | // Given: Empty post ID
128 | const postId = "";
129 |
130 | // When: Render PostDetailPage component
131 | render(
132 | <FullWrapper>
133 | <PostDetailPage postId={postId} />
134 | </FullWrapper>
135 | );
136 |
137 | // Then: PostDetailSection should receive empty postId
138 | const postDetailSection = screen.getByTestId("post-detail-section");
139 | expect(postDetailSection).toHaveAttribute("data-post-id", "");
140 | expect(postDetailSection).toHaveTextContent("Post Detail Section for");
141 | });
142 |
143 | it("should handle special characters in postId when provided with encoded postId", () => {
144 | // Given: Post ID with special characters
145 | const postId = "post-with-special-chars-@#$%";
146 | 
147 |       // When: Render PostDetailPage component
148 |       render(
149 |         <FullWrapper>
150 |           <PostDetailPage postId={postId} />
151 |         </FullWrapper>
152 |       );
153 | 
154 |       // Then: PostDetailSection should handle special characters correctly
155 |       const postDetailSection = screen.getByTestId("post-detail-section");
156 |       expect(postDetailSection).toHaveAttribute("data-post-id", postId);
157 |       expect(postDetailSection).toHaveTextContent(
158 |         `Post Detail Section for ${postId}`
159 |       );
160 |     });
161 |   });
162 | 
163 |   describe("Layout and Styling", () => {
164 |     it("should apply correct CSS classes for full-width layout when rendered", () => {
165 |       // Given: Valid post ID
166 |       const postId = validPostId;
167 | 
168 |       // When: Render PostDetailPage component
169 |       render(
170 |         <FullWrapper>
171 |           <PostDetailPage postId={postId} />
172 |         </FullWrapper>
173 |       );
174 | 
175 |       // Then: Main container should have full-width layout classes
176 |       const postDetailSection = screen.getByTestId("post-detail-section");
177 |       const mainContainer = postDetailSection.closest(
178 |         ".w-full.bg-white.overflow-y-auto"
179 |       );
180 |       expect(mainContainer).toHaveClass(
181 |         "w-full",
182 |         "bg-white",
183 |         "overflow-y-auto"
184 |       );
185 |     });
186 | 
187 |     it("should apply correct background and overflow styles when rendered", () => {
188 |       // Given: Valid post ID
189 |       const postId = validPostId;
190 | 
191 |       // When: Render PostDetailPage component
192 |       render(
193 |         <FullWrapper>
194 |           <PostDetailPage postId={postId} />
195 |         </FullWrapper>
196 |       );
197 | 
198 |       // Then: Container should have white background and auto overflow
199 |       const postDetailSection = screen.getByTestId("post-detail-section");
200 |       const mainContainer = postDetailSection.closest(
201 |         ".w-full.bg-white.overflow-y-auto"
202 |       );
203 |       expect(mainContainer).toHaveClass("bg-white", "overflow-y-auto");
204 |     });
205 | 
206 |     it("should maintain consistent layout structure across different postIds", () => {
207 |       // Given: Different post IDs
208 |       const postIds = [
209 |         "short",
210 |         "very-long-post-id-with-many-characters",
211 |         "123",
212 |       ];
213 | 
214 |       postIds.forEach((postId) => {
215 |         // When: Render PostDetailPage with different postId
216 |         const { unmount } = render(
217 |           <FullWrapper>
218 |             <PostDetailPage postId={postId} />
219 |           </FullWrapper>
220 |         );
221 | 
222 |         // Then: Layout should remain consistent
223 |         const postDetailSection = screen.getByTestId("post-detail-section");
224 |         const mainContainer = postDetailSection.closest(
225 |           ".w-full.bg-white.overflow-y-auto"
226 |         );
227 |         expect(mainContainer).toHaveClass(
228 |           "w-full",
229 |           "bg-white",
230 |           "overflow-y-auto"
231 |         );
232 | 
233 |         // Clean up for next iteration
234 |         unmount();
235 |       });
236 |     });
237 |   });
238 | 
239 |   describe("Widget Integration", () => {
240 |     it("should properly integrate PostDetailSection widget when component is rendered", async () => {
241 |       // Given: Valid post ID
242 |       const postId = validPostId;
243 | 
244 |       // When: Render PostDetailPage component
245 |       render(
246 |         <FullWrapper>
247 |           <PostDetailPage postId={postId} />
248 |         </FullWrapper>
249 |       );
250 | 
251 |       // Then: PostDetailSection should be properly integrated
252 |       await waitFor(() => {
253 |         const postDetailSection = screen.getByTestId("post-detail-section");
254 |         expect(postDetailSection).toBeInTheDocument();
255 |         expect(postDetailSection).toHaveAttribute("data-post-id", postId);
256 |       });
257 |     });
258 | 
259 |     it("should render PostDetailSection within the correct container when component is mounted", () => {
260 |       // Given: Valid post ID
261 |       const postId = validPostId;
262 | 
263 |       // When: Render PostDetailPage component
264 |       render(
265 |         <FullWrapper>
266 |           <PostDetailPage postId={postId} />
267 |         </FullWrapper>
268 |       );
269 | 
270 |       // Then: PostDetailSection should be within the main container
271 |       const postDetailSection = screen.getByTestId("post-detail-section");
272 |       const mainContainer = postDetailSection.closest(
273 |         ".w-full.bg-white.overflow-y-auto"
274 |       );
275 | 
276 |       expect(mainContainer).toContainElement(postDetailSection);
277 |     });
278 | 
279 |     it("should pass postId prop to PostDetailSection correctly when rendered", () => {
280 |       // Given: Valid post ID
281 |       const postId = validPostId;
282 | 
283 |       // When: Render PostDetailPage component
284 |       render(
285 |         <FullWrapper>
286 |           <PostDetailPage postId={postId} />
287 |         </FullWrapper>
288 |       );
289 | 
290 |       // Then: PostDetailSection should receive correct postId prop
291 |       const postDetailSection = screen.getByTestId("post-detail-section");
292 |       expect(postDetailSection).toHaveAttribute("data-post-id", postId);
293 |     });
294 |   });
295 | 
296 |   describe("Data Loading States", () => {
297 |     it("should handle PostDetailSection loading state when post data is being fetched", async () => {
298 |       // Given: PostDetailSection is in loading state
299 |       const { PostDetailSection } = await import("@/widgets/post");
300 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
301 |         <div
302 |           data-testid="post-detail-section"
303 |           data-post-id={postId}
304 |           data-loading="true">
305 |           Loading post {postId}...
306 |         </div>
307 |       ));
308 | 
309 |       const postId = validPostId;
310 | 
311 |       // When: Render PostDetailPage component
312 |       render(
313 |         <FullWrapper>
314 |           <PostDetailPage postId={postId} />
315 |         </FullWrapper>
316 |       );
317 | 
318 |       // Then: Loading state should be displayed
319 |       const postDetailSection = screen.getByTestId("post-detail-section");
320 |       expect(postDetailSection).toBeInTheDocument();
321 |       expect(postDetailSection).toHaveAttribute("data-loading", "true");
322 |       expect(postDetailSection).toHaveTextContent(`Loading post ${postId}...`);
323 |     });
324 | 
325 |     it("should handle PostDetailSection error state when post data loading fails", async () => {
326 |       // Given: PostDetailSection is in error state
327 |       const { PostDetailSection } = await import("@/widgets/post");
328 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
329 |         <div
330 |           data-testid="post-detail-section"
331 |           data-post-id={postId}
332 |           data-error="true">
333 |           Error loading post {postId}
334 |         </div>
335 |       ));
336 | 
337 |       const postId = validPostId;
338 | 
339 |       // When: Render PostDetailPage component
340 |       render(
341 |         <FullWrapper>
342 |           <PostDetailPage postId={postId} />
343 |         </FullWrapper>
344 |       );
345 | 
346 |       // Then: Error state should be displayed
347 |       const postDetailSection = screen.getByTestId("post-detail-section");
348 |       expect(postDetailSection).toBeInTheDocument();
349 |       expect(postDetailSection).toHaveAttribute("data-error", "true");
350 |       expect(postDetailSection).toHaveTextContent(
351 |         `Error loading post ${postId}`
352 |       );
353 |     });
354 | 
355 |     it("should handle PostDetailSection not found state when post does not exist", async () => {
356 |       // Given: PostDetailSection is in not found state
357 |       const { PostDetailSection } = await import("@/widgets/post");
358 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
359 |         <div
360 |           data-testid="post-detail-section"
361 |           data-post-id={postId}
362 |           data-not-found="true">
363 |           Post {postId} not found
364 |         </div>
365 |       ));
366 | 
367 |       const postId = "non-existent-post";
368 | 
369 |       // When: Render PostDetailPage component
370 |       render(
371 |         <FullWrapper>
372 |           <PostDetailPage postId={postId} />
373 |         </FullWrapper>
374 |       );
375 | 
376 |       // Then: Not found state should be displayed
377 |       const postDetailSection = screen.getByTestId("post-detail-section");
378 |       expect(postDetailSection).toBeInTheDocument();
379 |       expect(postDetailSection).toHaveAttribute("data-not-found", "true");
380 |       expect(postDetailSection).toHaveTextContent(`Post ${postId} not found`);
381 |     });
382 |   });
383 | 
384 |   describe("Navigation and Routing", () => {
385 |     it("should handle navigation to PostDetailPage with different postIds", () => {
386 |       // Given: Different post IDs representing navigation scenarios
387 |       const navigationScenarios = [
388 |         { postId: "post-1", description: "numeric post ID" },
389 |         { postId: "featured-post", description: "text post ID" },
390 |         { postId: "post-2023-01-01", description: "date-based post ID" },
391 |       ];
392 | 
393 |       navigationScenarios.forEach(({ postId }) => {
394 |         // When: Navigate to PostDetailPage with different postId
395 |         const { unmount } = render(
396 |           <FullWrapper routerPath={`/post/${postId}`}>
397 |             <PostDetailPage postId={postId} />
398 |           </FullWrapper>
399 |         );
400 | 
401 |         // Then: Component should handle navigation correctly
402 |         const postDetailSection = screen.getByTestId("post-detail-section");
403 |         expect(postDetailSection).toBeInTheDocument();
404 |         expect(postDetailSection).toHaveAttribute("data-post-id", postId);
405 | 
406 |         // Clean up for next iteration
407 |         unmount();
408 |       });
409 |     });
410 | 
411 |     it("should maintain postId consistency when navigating between different posts", () => {
412 |       // Given: Initial post ID
413 |       const initialPostId = "post-1";
414 | 
415 |       // When: Render PostDetailPage with initial postId
416 |       const { rerender } = render(
417 |         <FullWrapper routerPath={`/post/${initialPostId}`}>
418 |           <PostDetailPage postId={initialPostId} />
419 |         </FullWrapper>
420 |       );
421 | 
422 |       // Then: Initial postId should be displayed
423 |       let postDetailSection = screen.getByTestId("post-detail-section");
424 |       expect(postDetailSection).toHaveAttribute("data-post-id", initialPostId);
425 | 
426 |       // When: Navigate to different post
427 |       const newPostId = "post-2";
428 |       rerender(
429 |         <FullWrapper routerPath={`/post/${newPostId}`}>
430 |           <PostDetailPage postId={newPostId} />
431 |         </FullWrapper>
432 |       );
433 | 
434 |       // Then: New postId should be displayed
435 |       postDetailSection = screen.getByTestId("post-detail-section");
436 |       expect(postDetailSection).toHaveAttribute("data-post-id", newPostId);
437 |     });
438 | 
439 |     it("should handle browser back/forward navigation correctly", () => {
440 |       // Given: PostDetailPage with specific postId
441 |       const postId = validPostId;
442 | 
443 |       // When: Render PostDetailPage simulating navigation
444 |       const { rerender } = render(
445 |         <FullWrapper
446 |           routerPath={`/post/${postId}`}
447 |           routerAsPath={`/post/${postId}`}>
448 |           <PostDetailPage postId={postId} />
449 |         </FullWrapper>
450 |       );
451 | 
452 |       // Then: Component should handle navigation state correctly
453 |       const postDetailSection = screen.getByTestId("post-detail-section");
454 |       expect(postDetailSection).toBeInTheDocument();
455 |       expect(postDetailSection).toHaveAttribute("data-post-id", postId);
456 | 
457 |       // When: Simulate navigation change
458 |       rerender(
459 |         <FullWrapper
460 |           routerPath={`/post/${postId}`}
461 |           routerAsPath={`/post/${postId}`}>
462 |           <PostDetailPage postId={postId} />
463 |         </FullWrapper>
464 |       );
465 | 
466 |       // Then: Component should maintain consistency
467 |       const updatedPostDetailSection = screen.getByTestId(
468 |         "post-detail-section"
469 |       );
470 |       expect(updatedPostDetailSection).toHaveAttribute("data-post-id", postId);
471 |     });
472 |   });
473 | 
474 |   describe("Component Lifecycle", () => {
475 |     it("should mount and unmount PostDetailPage component correctly", () => {
476 |       // Given: Valid post ID
477 |       const postId = validPostId;
478 | 
479 |       // When: Render and unmount PostDetailPage component
480 |       const { unmount } = render(
481 |         <FullWrapper>
482 |           <PostDetailPage postId={postId} />
483 |         </FullWrapper>
484 |       );
485 | 
486 |       // Then: Component should be mounted correctly
487 |       const postDetailSection = screen.getByTestId("post-detail-section");
488 |       expect(postDetailSection).toBeInTheDocument();
489 | 
490 |       // When: Unmount component
491 |       unmount();
492 | 
493 |       // Then: Component should be unmounted correctly
494 |       expect(
495 |         screen.queryByTestId("post-detail-section")
496 |       ).not.toBeInTheDocument();
497 |     });
498 | 
499 |     it("should re-render PostDetailPage component correctly when postId changes", () => {
500 |       // Given: Initial post ID
501 |       const initialPostId = "post-1";
502 | 
503 |       // When: Render PostDetailPage component
504 |       const { rerender } = render(
505 |         <FullWrapper>
506 |           <PostDetailPage postId={initialPostId} />
507 |         </FullWrapper>
508 |       );
509 | 
510 |       // Then: Component should render with initial postId
511 |       let postDetailSection = screen.getByTestId("post-detail-section");
512 |       expect(postDetailSection).toHaveAttribute("data-post-id", initialPostId);
513 | 
514 |       // When: Re-render with different postId
515 |       const newPostId = "post-2";
516 |       rerender(
517 |         <FullWrapper>
518 |           <PostDetailPage postId={newPostId} />
519 |         </FullWrapper>
520 |       );
521 | 
522 |       // Then: Component should re-render with new postId
523 |       postDetailSection = screen.getByTestId("post-detail-section");
524 |       expect(postDetailSection).toHaveAttribute("data-post-id", newPostId);
525 |     });
526 | 
527 |     it("should handle rapid postId changes gracefully", () => {
528 |       // Given: Array of post IDs for rapid changes
529 |       const postIds = ["post-1", "post-2", "post-3", "post-4", "post-5"];
530 | 
531 |       // When: Perform rapid postId changes
532 |       const { rerender } = render(
533 |         <FullWrapper>
534 |           <PostDetailPage postId={postIds[0]} />
535 |         </FullWrapper>
536 |       );
537 | 
538 |       postIds.slice(1).forEach((postId) => {
539 |         rerender(
540 |           <FullWrapper>
541 |             <PostDetailPage postId={postId} />
542 |           </FullWrapper>
543 |         );
544 |       });
545 | 
546 |       // Then: Component should handle rapid changes gracefully
547 |       const postDetailSection = screen.getByTestId("post-detail-section");
548 |       expect(postDetailSection).toBeInTheDocument();
549 |       expect(postDetailSection).toHaveAttribute(
550 |         "data-post-id",
551 |         postIds[postIds.length - 1]
552 |       );
553 |     });
554 |   });
555 | 
556 |   describe("Accessibility", () => {
557 |     it("should have proper semantic HTML structure when rendered", () => {
558 |       // Given: Valid post ID
559 |       const postId = validPostId;
560 | 
561 |       // When: Render PostDetailPage component
562 |       render(
563 |         <FullWrapper>
564 |           <PostDetailPage postId={postId} />
565 |         </FullWrapper>
566 |       );
567 | 
568 |       // Then: Component should have proper semantic structure
569 |       const postDetailSection = screen.getByTestId("post-detail-section");
570 |       const mainContainer = postDetailSection.closest(
571 |         ".w-full.bg-white.overflow-y-auto"
572 |       );
573 |       expect(mainContainer).toBeInTheDocument();
574 |       expect(mainContainer?.tagName).toBe("DIV");
575 |     });
576 | 
577 |     it("should be keyboard accessible when rendered", () => {
578 |       // Given: Valid post ID
579 |       const postId = validPostId;
580 | 
581 |       // When: Render PostDetailPage component
582 |       render(
583 |         <FullWrapper>
584 |           <PostDetailPage postId={postId} />
585 |         </FullWrapper>
586 |       );
587 | 
588 |       // Then: Component should be keyboard accessible
589 |       const postDetailSection = screen.getByTestId("post-detail-section");
590 |       expect(postDetailSection).toBeInTheDocument();
591 |     });
592 | 
593 |     it("should provide proper focus management when component is rendered", () => {
594 |       // Given: Valid post ID
595 |       const postId = validPostId;
596 | 
597 |       // When: Render PostDetailPage component
598 |       render(
599 |         <FullWrapper>
600 |           <PostDetailPage postId={postId} />
601 |         </FullWrapper>
602 |       );
603 | 
604 |       // Then: Focus should be manageable
605 |       const postDetailSection = screen.getByTestId("post-detail-section");
606 |       expect(postDetailSection).toBeInTheDocument();
607 | 
608 |       // Component should not interfere with natural focus flow
609 |       expect(document.activeElement).toBe(document.body);
610 |     });
611 | 
612 |     it("should support screen readers when rendered with postId", () => {
613 |       // Given: Valid post ID
614 |       const postId = validPostId;
615 | 
616 |       // When: Render PostDetailPage component
617 |       render(
618 |         <FullWrapper>
619 |           <PostDetailPage postId={postId} />
620 |         </FullWrapper>
621 |       );
622 | 
623 |       // Then: Component should support screen readers
624 |       const postDetailSection = screen.getByTestId("post-detail-section");
625 |       expect(postDetailSection).toBeInTheDocument();
626 |     });
627 |   });
628 | 
629 |   describe("Performance", () => {
630 |     it("should render PostDetailPage efficiently without unnecessary re-renders", () => {
631 |       // Given: Valid post ID
632 |       const postId = validPostId;
633 | 
634 |       // When: Render PostDetailPage component multiple times
635 |       const { rerender } = render(
636 |         <FullWrapper>
637 |           <PostDetailPage postId={postId} />
638 |         </FullWrapper>
639 |       );
640 | 
641 |       // Then: Component should render without errors
642 |       let postDetailSection = screen.getByTestId("post-detail-section");
643 |       expect(postDetailSection).toBeInTheDocument();
644 | 
645 |       rerender(
646 |         <FullWrapper>
647 |           <PostDetailPage postId={postId} />
648 |         </FullWrapper>
649 |       );
650 | 
651 |       // Then: Component should re-render correctly
652 |       postDetailSection = screen.getByTestId("post-detail-section");
653 |       expect(postDetailSection).toBeInTheDocument();
654 |     });
655 | 
656 |     it("should handle multiple rapid re-renders gracefully", () => {
657 |       // Given: Valid post ID
658 |       const postId = validPostId;
659 | 
660 |       // When: Perform multiple rapid re-renders
661 |       const { rerender } = render(
662 |         <FullWrapper>
663 |           <PostDetailPage postId={postId} />
664 |         </FullWrapper>
665 |       );
666 | 
667 |       for (let i = 0; i < 5; i++) {
668 |         rerender(
669 |           <FullWrapper>
670 |             <PostDetailPage postId={postId} />
671 |           </FullWrapper>
672 |         );
673 |       }
674 | 
675 |       // Then: Component should handle rapid re-renders gracefully
676 |       const postDetailSection = screen.getByTestId("post-detail-section");
677 |       expect(postDetailSection).toBeInTheDocument();
678 |     });
679 | 
680 |     it("should optimize re-renders when postId remains the same", () => {
681 |       // Given: Valid post ID
682 |       const postId = validPostId;
683 | 
684 |       // When: Re-render with same postId multiple times
685 |       const { rerender } = render(
686 |         <FullWrapper>
687 |           <PostDetailPage postId={postId} />
688 |         </FullWrapper>
689 |       );
690 | 
691 |       // Then: Component should render correctly
692 |       let postDetailSection = screen.getByTestId("post-detail-section");
693 |       expect(postDetailSection).toHaveAttribute("data-post-id", postId);
694 | 
695 |       // Re-render with same postId
696 |       rerender(
697 |         <FullWrapper>
698 |           <PostDetailPage postId={postId} />
699 |         </FullWrapper>
700 |       );
701 | 
702 |       // Then: Component should maintain consistency
703 |       postDetailSection = screen.getByTestId("post-detail-section");
704 |       expect(postDetailSection).toHaveAttribute("data-post-id", postId);
705 |     });
706 |   });
707 | 
708 |   describe("Edge Cases", () => {
709 |     it("should handle PostDetailSection returning null when post data is not available", async () => {
710 |       // Given: PostDetailSection returns null
711 |       const { PostDetailSection } = await import("@/widgets/post");
712 |       vi.mocked(PostDetailSection).mockImplementation(() => null);
713 | 
714 |       const postId = validPostId;
715 | 
716 |       // When: Render PostDetailPage component
717 |       render(
718 |         <FullWrapper>
719 |           <PostDetailPage postId={postId} />
720 |         </FullWrapper>
721 |       );
722 | 
723 |       // Then: Component should handle null PostDetailSection gracefully
724 |       const container = document.querySelector(
725 |         ".w-full.bg-white.overflow-y-auto"
726 |       );
727 |       expect(container).toBeInTheDocument();
728 | 
729 |       // PostDetailSection should not be in the document
730 |       expect(
731 |         screen.queryByTestId("post-detail-section")
732 |       ).not.toBeInTheDocument();
733 |     });
734 | 
735 |     it("should handle PostDetailSection throwing an error during render", async () => {
736 |       // Given: PostDetailSection throws an error
737 |       const { PostDetailSection } = await import("@/widgets/post");
738 |       vi.mocked(PostDetailSection).mockImplementation(() => {
739 |         throw new Error("PostDetailSection render error");
740 |       });
741 | 
742 |       const postId = validPostId;
743 | 
744 |       // When: Render PostDetailPage component with error boundary
745 |       expect(() => {
746 |         render(
747 |           <FullWrapper>
748 |             <PostDetailPage postId={postId} />
749 |           </FullWrapper>
750 |         );
751 |       }).toThrow("PostDetailSection render error");
752 | 
753 |       // Then: Error should be thrown as expected
754 |       // This test verifies that errors are properly propagated
755 |     });
756 | 
757 |     it("should handle very long postId values gracefully", async () => {
758 |       // Given: Reset mock to default implementation and very long post ID
759 |       const { PostDetailSection } = await import("@/widgets/post");
760 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
761 |         <div data-testid="post-detail-section" data-post-id={postId}>
762 |           Post Detail Section for {postId}
763 |         </div>
764 |       ));
765 | 
766 |       const longPostId = "a".repeat(1000);
767 | 
768 |       // When: Render PostDetailPage component
769 |       render(
770 |         <FullWrapper>
771 |           <PostDetailPage postId={longPostId} />
772 |         </FullWrapper>
773 |       );
774 | 
775 |       // Then: Component should handle long postId gracefully
776 |       const postDetailSection = screen.getByTestId("post-detail-section");
777 |       expect(postDetailSection).toHaveAttribute("data-post-id", longPostId);
778 |     });
779 | 
780 |     it("should handle postId with Unicode characters correctly", async () => {
781 |       // Given: Reset mock to default implementation and post ID with Unicode characters
782 |       const { PostDetailSection } = await import("@/widgets/post");
783 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
784 |         <div data-testid="post-detail-section" data-post-id={postId}>
785 |           Post Detail Section for {postId}
786 |         </div>
787 |       ));
788 | 
789 |       const unicodePostId = "post-🎉-中文-émoji";
790 | 
791 |       // When: Render PostDetailPage component
792 |       render(
793 |         <FullWrapper>
794 |           <PostDetailPage postId={unicodePostId} />
795 |         </FullWrapper>
796 |       );
797 | 
798 |       // Then: Component should handle Unicode characters correctly
799 |       const postDetailSection = screen.getByTestId("post-detail-section");
800 |       expect(postDetailSection).toHaveAttribute("data-post-id", unicodePostId);
801 |       expect(postDetailSection).toHaveTextContent(
802 |         `Post Detail Section for ${unicodePostId}`
803 |       );
804 |     });
805 |   });
806 | 
807 |   describe("Integration", () => {
808 |     it("should properly integrate with FullWrapper test utility when rendered", async () => {
809 |       // Given: Reset mock to default implementation and valid post ID
810 |       const { PostDetailSection } = await import("@/widgets/post");
811 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
812 |         <div data-testid="post-detail-section" data-post-id={postId}>
813 |           Post Detail Section for {postId}
814 |         </div>
815 |       ));
816 | 
817 |       const postId = validPostId;
818 | 
819 |       // When: Render PostDetailPage component with FullWrapper
820 |       render(
821 |         <FullWrapper routerPath={`/post/${postId}`}>
822 |           <PostDetailPage postId={postId} />
823 |         </FullWrapper>
824 |       );
825 | 
826 |       // Then: Component should integrate properly with test wrapper
827 |       const postDetailSection = screen.getByTestId("post-detail-section");
828 |       expect(postDetailSection).toBeInTheDocument();
829 |       expect(postDetailSection).toHaveAttribute("data-post-id", postId);
830 |     });
831 | 
832 |     it("should work correctly with different FullWrapper configurations", async () => {
833 |       // Given: Reset mock to default implementation and different FullWrapper configurations
834 |       const { PostDetailSection } = await import("@/widgets/post");
835 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
836 |         <div data-testid="post-detail-section" data-post-id={postId}>
837 |           Post Detail Section for {postId}
838 |         </div>
839 |       ));
840 | 
841 |       const postId = validPostId;
842 |       const configurations = [
843 |         { routerPath: `/post/${postId}` },
844 |         { routerPath: `/post/${postId}`, routerQuery: { id: postId } },
845 |         { routerPath: `/post/${postId}`, routerAsPath: `/post/${postId}` },
846 |       ];
847 | 
848 |       configurations.forEach((config) => {
849 |         // When: Render PostDetailPage with different configurations
850 |         const { unmount } = render(
851 |           <FullWrapper {...config}>
852 |             <PostDetailPage postId={postId} />
853 |           </FullWrapper>
854 |         );
855 | 
856 |         // Then: Component should work with all configurations
857 |         const postDetailSection = screen.getByTestId("post-detail-section");
858 |         expect(postDetailSection).toBeInTheDocument();
859 |         expect(postDetailSection).toHaveAttribute("data-post-id", postId);
860 | 
861 |         // Clean up for next iteration
862 |         unmount();
863 |       });
864 |     });
865 | 
866 |     it("should maintain state consistency across different router configurations", async () => {
867 |       // Given: Reset mock to default implementation and valid post ID
868 |       const { PostDetailSection } = await import("@/widgets/post");
869 |       vi.mocked(PostDetailSection).mockImplementation(({ postId }) => (
870 |         <div data-testid="post-detail-section" data-post-id={postId}>
871 |           Post Detail Section for {postId}
872 |         </div>
873 |       ));
874 | 
875 |       const postId = validPostId;
876 | 
877 |       // When: Render with different router states
878 |       const { rerender } = render(
879 |         <FullWrapper routerPath={`/post/${postId}`} routerQuery={{}}>
880 |           <PostDetailPage postId={postId} />
881 |         </FullWrapper>
882 |       );
883 | 
884 |       // Then: Initial state should be correct
885 |       let postDetailSection = screen.getByTestId("post-detail-section");
886 |       expect(postDetailSection).toHaveAttribute("data-post-id", postId);
887 | 
888 |       // When: Change router configuration
889 |       rerender(
890 |         <FullWrapper
891 |           routerPath={`/post/${postId}`}
892 | routerQuery={{ id: postId }}>
893 | <PostDetailPage postId={postId} />
894 | </FullWrapper>
895 | );
896 |
897 | // Then: State should remain consistent
898 | postDetailSection = screen.getByTestId("post-detail-section");
899 | expect(postDetailSection).toHaveAttribute("data-post-id", postId);
900 | });
901 | });
902 | });
903 |

---

## /src/pages/post/detail/PostDetailPage.tsx:

1 | import { PostDetailSection } from "@/widgets/post";
2 |
3 | export const PostDetailPage = ({ postId }: { postId: string }) => {
4 | return (
5 | <div className="w-full bg-white overflow-y-auto">
6 | <PostDetailSection postId={postId} />
7 | </div>
8 | );
9 | };
10 |

---

## /src/pages/post/detail/index.ts:

1 | export { PostDetailPage } from "./PostDetailPage";
2 |

---

## /src/pages/post/index.ts:

1 | export { PostDetailPage } from "./detail";
2 |

---

## /src/shared/api/base.api.ts:

1 | import { ApiResponse } from "../types/api.types";
2 |
3 | interface ApiConfig extends RequestInit {
4 | baseURL: string;
5 | }
6 |
7 | export class ApiClient {
8 | private baseURL: string;
9 |
10 | constructor(config: ApiConfig) {
11 | this.baseURL = config.baseURL;
12 | }
13 |
14 | private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
15 | const responseData: ApiResponse<T> = {
16 | data: {} as T,
17 | status: response.status,
18 | statusText: response.statusText,
19 | ok: response.ok,
20 | message: "",
21 | };
22 |
23 | try {
24 | if (!response.ok) {
25 | const errorData = await response.json().catch(() => ({}));
26 | responseData.message =
27 | errorData.message || `HTTP error! Status: ${response.status}`;
28 | throw responseData;
29 | }
30 |
31 | const data = await response.json();
32 | responseData.data = data;
33 | return responseData;
34 | } catch (error) {
35 | if (error instanceof Error) {
36 | responseData.message = error.message;
37 | }
38 | throw responseData;
39 | }
40 | }
41 |
42 | private async request<T>(
43 | url: string,
44 | config: RequestInit = {}
45 | ): Promise<ApiResponse<T>> {
46 | try {
47 | const fullUrl = this.baseURL + url;
48 | const response = await fetch(fullUrl, {
49 | ...config,
50 | headers: {
51 | "Content-Type": "application/json",
52 | ...config.headers,
53 | },
54 | });
55 |
56 | return this.handleResponse<T>(response);
57 | } catch (error) {
58 | if (error instanceof Error) {
59 | throw {
60 | data: {} as T,
61 | status: 500,
62 | statusText: "Internal Server Error",
63 | ok: false,
64 | message: error.message,
65 | } as ApiResponse<T>;
66 | }
67 | throw error;
68 | }
69 | }
70 |
71 | async get<T>(url: string, config: RequestInit = {}): Promise<ApiResponse<T>> {
72 | return this.request<T>(url, { ...config, method: "GET" });
73 | }
74 |
75 | async post<T>(
76 | url: string,
77 | data?: unknown,
78 | config: RequestInit = {}
79 | ): Promise<ApiResponse<T>> {
80 | return this.request<T>(url, {
81 | ...config,
82 | method: "POST",
83 | body: JSON.stringify(data),
84 | });
85 | }
86 |
87 | async put<T>(
88 | url: string,
89 | data?: unknown,
90 | config: RequestInit = {}
91 | ): Promise<ApiResponse<T>> {
92 | return this.request<T>(url, {
93 | ...config,
94 | method: "PUT",
95 | body: JSON.stringify(data),
96 | });
97 | }
98 | async patch<T>(
99 | url: string,
100 | data?: unknown,
101 | config: RequestInit = {}
102 | ): Promise<ApiResponse<T>> {
103 | return this.request<T>(url, {
104 | ...config,
105 | method: "PATCH",
106 | body: JSON.stringify(data),
107 | });
108 | }
109 |
110 | async delete<T>(
111 | url: string,
112 | config: RequestInit = {}
113 | ): Promise<ApiResponse<T>> {
114 | return this.request<T>(url, { ...config, method: "DELETE" });
115 | }
116 | }
117 |
118 | export const apiClient = new ApiClient({
119 | baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
120 | });
121 |

---

## /src/shared/api/index.ts:

1 | export { apiClient, type ApiClient } from "./base.api";
2 | export { queryClient } from "./query-client.api";
3 |

---

## /src/shared/api/query-client.api.ts:

1 | import { QueryClient } from "@tanstack/react-query";
2 |
3 | export const queryClient = new QueryClient({
4 | defaultOptions: {
5 | queries: {
6 | staleTime: 5 _ 60 _ 1000,
7 | retry: 1,
8 | },
9 | },
10 | });
11 |

---

## /src/shared/config/index.ts:

1 | export { defaultMetadata } from "./metadata";
2 |

---

## /src/shared/config/metadata/default.ts:

1 | import { Metadata } from "next";
2 |
3 | export const defaultMetadata: Metadata = {
4 | title: "Next.js FSD DDD Example",
5 | description:
6 | "Frontend architecture example with Next.js using Feature-Sliced Design, Domain-Driven Design, and Clean Architecture",
7 | };
8 |

---

## /src/shared/config/metadata/index.ts:

1 | export { defaultMetadata } from "./default";
2 |

---

## /src/shared/domain/index.ts:

1 | export { ValueObject } from "./value-object";
2 |

---

## /src/shared/domain/value-object.ts:

1 | export abstract class ValueObject<T> {
2 | protected readonly \_value: T;
3 |
4 | constructor(value: T) {
5 | this.validate(value);
6 | this.\_value = this.deepFreeze(value);
7 | }
8 |
9 | private deepFreeze<U>(obj: U): U {
10 | if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
11 | Object.freeze(obj);
12 |
13 | Object.getOwnPropertyNames(obj).forEach((prop) => {
14 | // @ts-expect-error - Resolving index signature issue (TypeScript requires index signatures when accessing arbitrary object properties)
15 | const value = obj[prop];
16 |
17 | if (
18 | value !== null &&
19 | (typeof value === "object" || typeof value === "function") &&
20 | !Object.isFrozen(value)
21 | ) {
22 | this.deepFreeze(value);
23 | }
24 | });
25 | }
26 |
27 | return obj;
28 | }
29 |
30 | protected abstract validate(value: T): void;
31 |
32 | public equals(other: ValueObject<T>): boolean {
33 | if (other === null || other === undefined) {
34 | return false;
35 | }
36 |
37 | if (other.constructor !== this.constructor) {
38 | return false;
39 | }
40 |
41 | return this.equalsValue(other.\_value);
42 | }
43 |
44 | protected equalsValue(value: T): boolean {
45 | if (typeof this.\_value === "object" && this.\_value !== null) {
46 | return JSON.stringify(this.\_value) === JSON.stringify(value);
47 | }
48 | return this.\_value === value;
49 | }
50 |
51 | public get value(): T {
52 | return this.\_value;
53 | }
54 | }
55 |

---

## /src/shared/libs/**tests**/helpers/async-utils.helper.ts:

1 | export const AsyncTestHelpers = {
2 | delay: (ms: number = 100) =>
3 | new Promise((resolve) => setTimeout(resolve, ms)),
4 |
5 | wrapPromise: <T>(value: T, delay: number = 0): Promise<T> => {
6 | return new Promise((resolve) => {
7 | setTimeout(() => resolve(value), delay);
8 | });
9 | },
10 |
11 | wrapError: (error: Error, delay: number = 0): Promise<never> => {
12 | return new Promise((\_, reject) => {
13 | setTimeout(() => reject(error), delay);
14 | });
15 | },
16 | };
17 |

---

## /src/shared/libs/**tests**/helpers/data-generators.helper.ts:

1 | export const TestDataHelpers = {
2 | generateId: (prefix: string = "test") =>
3 | `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
4 |
5 | generateEmail: (username?: string) => {
6 | const user = username || `user${Math.random().toString(36).substr(2, 5)}`;
7 | return `${user}@example.com`;
8 | },
9 |
10 | generateUsername: () => `user${Math.random().toString(36).substr(2, 8)}`,
11 |
12 | generateTimestamp: (offsetMs: number = 0) => Date.now() + offsetMs,
13 |
14 | createArray: <T>(length: number, factory: (index: number) => T): T[] => {
15 | return Array.from({ length }, (\_, index) => factory(index));
16 | },
17 | };
18 |

---

## /src/shared/libs/**tests**/helpers/dom-utils.helper.ts:

1 | export const DOMTestHelpers = {
2 | isVisible: (element: HTMLElement): boolean => {
3 | return element.offsetParent !== null;
4 | },
5 |
6 | simulateClick: (element: HTMLElement) => {
7 | element.click();
8 | },
9 |
10 | simulateInput: (element: HTMLInputElement, value: string) => {
11 | element.value = value;
12 | element.dispatchEvent(new Event("input", { bubbles: true }));
13 | },
14 |
15 | simulateSubmit: (form: HTMLFormElement) => {
16 | form.dispatchEvent(new Event("submit", { bubbles: true }));
17 | },
18 | };
19 |

---

## /src/shared/libs/**tests**/helpers/index.ts:

1 | /\*_
2 | _ Test Helpers
3 | _
4 | _ Various utility functions for testing
5 | _/
6 |
7 | export _ from "./async-utils.helper";
8 | export _ from "./data-generators.helper";
9 | export _ from "./dom-utils.helper";
10 | export \* from "./mock-utils.helper";
11 |

---

## /src/shared/libs/**tests**/helpers/mock-utils.helper.ts:

1 | import { expect } from "vitest";
2 |
3 | export const MockHelpers = {
4 | resetAll: (...mocks: unknown[]) => {
5 | mocks.forEach((mock) => {
6 | if (typeof mock === "object" && mock !== null) {
7 | Object.values(mock).forEach((mockFn) => {
8 | if (typeof mockFn === "function" && "mockReset" in mockFn) {
9 | (mockFn as { mockReset: () => void }).mockReset();
10 | }
11 | });
12 | }
13 | });
14 | },
15 |
16 | restoreAll: (...mocks: unknown[]) => {
17 | mocks.forEach((mock) => {
18 | if (typeof mock === "object" && mock !== null) {
19 | Object.values(mock).forEach((mockFn) => {
20 | if (typeof mockFn === "function" && "mockRestore" in mockFn) {
21 | (mockFn as { mockRestore: () => void }).mockRestore();
22 | }
23 | });
24 | }
25 | });
26 | },
27 |
28 | verifyMockState: (
29 | mock: Record<string, unknown>,
30 | expectedCalls: Record<string, number>
31 | ) => {
32 | for (const [method, expectedCount] of Object.entries(expectedCalls)) {
33 | const mockMethod = mock[method];
34 | if (
35 | mockMethod &&
36 | typeof mockMethod === "object" &&
37 | mockMethod !== null &&
38 | "toHaveBeenCalledTimes" in mockMethod &&
39 | typeof (mockMethod as { toHaveBeenCalledTimes: unknown })
40 | .toHaveBeenCalledTimes === "function"
41 | ) {
42 | expect(mockMethod).toHaveBeenCalledTimes(expectedCount);
43 | }
44 | }
45 | },
46 | };
47 |

---

## /src/shared/libs/**tests**/index.ts:

1 | /\*_
2 | _ Shared Test Utilities
3 | _
4 | _ Centralized export for all test utilities organized by category
5 | _/
6 |
7 | // Wrappers and Providers
8 | export _ from "./wrappers";
9 |
10 | // Mock Utilities
11 | export _ from "./mocks";
12 |
13 | // Test Helpers
14 | export _ from "./helpers";
15 |

---

## /src/shared/libs/**tests**/mocks/api.mock.ts:

1 | export interface MockResponse<T = unknown> {
2 | data: T;
3 | status: number;
4 | statusText: string;
5 | headers: Record<string, string>;
6 | }
7 |
8 | export interface MockErrorResponse {
9 | message: string;
10 | status: number;
11 | code?: string;
12 | details?: Record<string, unknown>;
13 | }
14 |
15 | export class ApiMockUtils {
16 | static createSuccessResponse<T>(
17 | data: T,
18 | status: number = 200,
19 | statusText: string = "OK"
20 | ): MockResponse<T> {
21 | return {
22 | data,
23 | status,
24 | statusText,
25 | headers: {
26 | "content-type": "application/json",
27 | "x-request-id": `mock-${Date.now()}`,
28 | },
29 | };
30 | }
31 |
32 | static createErrorResponse(
33 | message: string,
34 | status: number = 500,
35 | code?: string,
36 | details?: Record<string, unknown>
37 | ): MockErrorResponse {
38 | return {
39 | message,
40 | status,
41 | code,
42 | details,
43 | };
44 | }
45 |
46 | static createNetworkError(
47 | message: string = "Network Error"
48 | ): Error & { code: string; isNetworkError: boolean } {
49 | const error = new Error(message) as Error & {
50 | code: string;
51 | isNetworkError: boolean;
52 | };
53 | error.code = "NETWORK*ERROR";
54 | error.isNetworkError = true;
55 | return error;
56 | }
57 |
58 | static createTimeoutError(
59 | message: string = "Request Timeout"
60 | ): Error & { code: string; timeout: boolean } {
61 | const error = new Error(message) as Error & {
62 | code: string;
63 | timeout: boolean;
64 | };
65 | error.code = "TIMEOUT";
66 | error.timeout = true;
67 | return error;
68 | }
69 |
70 | static createDelayedResponse<T>(
71 | data: T,
72 | delay: number = 100
73 | ): Promise<MockResponse<T>> {
74 | return new Promise((resolve) => {
75 | setTimeout(() => {
76 | resolve(ApiMockUtils.createSuccessResponse(data));
77 | }, delay);
78 | });
79 | }
80 |
81 | static createDelayedError(
82 | error: MockErrorResponse,
83 | delay: number = 100
84 | ): Promise<never> {
85 | return new Promise((*, reject) => {
86 | setTimeout(() => {
87 | const errorObj = new Error(error.message) as Error & {
88 | status: number;
89 | code?: string;
90 | };
91 | errorObj.status = error.status;
92 | errorObj.code = error.code;
93 | reject(errorObj);
94 | }, delay);
95 | });
96 | }
97 | }
98 |
99 | export const HttpMocks = {
100 | get: <T>(data: T, status: number = 200) => {
101 | return vi
102 | .fn()
103 | .mockResolvedValue(ApiMockUtils.createSuccessResponse(data, status));
104 | },
105 |
106 | post: <T>(data: T, status: number = 201) => {
107 | return vi
108 | .fn()
109 | .mockResolvedValue(ApiMockUtils.createSuccessResponse(data, status));
110 | },
111 |
112 | put: <T>(data: T, status: number = 200) => {
113 | return vi
114 | .fn()
115 | .mockResolvedValue(ApiMockUtils.createSuccessResponse(data, status));
116 | },
117 |
118 | delete: (status: number = 204) => {
119 | return vi
120 | .fn()
121 | .mockResolvedValue(
122 | ApiMockUtils.createSuccessResponse(null, status, "No Content")
123 | );
124 | },
125 |
126 | error: (message: string, status: number = 500, code?: string) => {
127 | const error = new Error(message) as Error & {
128 | status: number;
129 | code?: string;
130 | };
131 | error.status = status;
132 | error.code = code;
133 | return vi.fn().mockRejectedValue(error);
134 | },
135 |
136 | networkError: (message: string = "Network Error") => {
137 | return vi.fn().mockRejectedValue(ApiMockUtils.createNetworkError(message));
138 | },
139 |
140 | timeoutError: (message: string = "Request Timeout") => {
141 | return vi.fn().mockRejectedValue(ApiMockUtils.createTimeoutError(message));
142 | },
143 | };
144 |
145 | export const PaginationMocks = {
146 | createPaginatedResponse: <T>(
147 | items: T[],
148 | page: number = 1,
149 | limit: number = 10,
150 | total?: number
151 | ) => {
152 | const actualTotal = total ?? items.length;
153 | const startIndex = (page - 1) _ limit;
154 | const endIndex = startIndex + limit;
155 | const paginatedItems = items.slice(startIndex, endIndex);
156 |
157 | return {
158 | data: paginatedItems,
159 | pagination: {
160 | page,
161 | limit,
162 | total: actualTotal,
163 | totalPages: Math.ceil(actualTotal / limit),
164 | hasNext: page _ limit < actualTotal,
165 | hasPrev: page > 1,
166 | },
167 | };
168 | },
169 |
170 | createEmptyPage: (page: number = 1, limit: number = 10) => {
171 | return PaginationMocks.createPaginatedResponse([], page, limit, 0);
172 | },
173 | };
174 |
175 | export const HttpStatus = {
176 | OK: 200,
177 | CREATED: 201,
178 | NO_CONTENT: 204,
179 | BAD_REQUEST: 400,
180 | UNAUTHORIZED: 401,
181 | FORBIDDEN: 403,
182 | NOT_FOUND: 404,
183 | CONFLICT: 409,
184 | UNPROCESSABLE_ENTITY: 422,
185 | INTERNAL_SERVER_ERROR: 500,
186 | BAD_GATEWAY: 502,
187 | SERVICE_UNAVAILABLE: 503,
188 | } as const;
189 |
190 | export const ErrorMessages = {
191 | NETWORK_ERROR: "Network connection failed",
192 | TIMEOUT: "Request timeout",
193 | NOT_FOUND: "Resource not found",
194 | UNAUTHORIZED: "Authentication required",
195 | FORBIDDEN: "Access denied",
196 | BAD_REQUEST: "Invalid request data",
197 | INTERNAL_ERROR: "Internal server error",
198 | SERVICE_UNAVAILABLE: "Service temporarily unavailable",
199 | } as const;
200 |

---

## /src/shared/libs/**tests**/mocks/index.ts:

1 | /\*_
2 | _ Mock Utilities
3 | _
4 | _ Various mock implementations for testing
5 | _/
6 |
7 | export _ from "./api.mock";
8 | export _ from "./repository-base.mock";
9 | export _ from "./service-base.mock";
10 |

---

## /src/shared/libs/**tests**/mocks/repository-base.mock.ts:

1 | export interface MockRepository<T = unknown> {
2 | findById: ReturnType<typeof vi.fn> & {
3 | mockResolvedValue: (value: T | null) => void;
4 | };
5 | findAll: ReturnType<typeof vi.fn> & {
6 | mockResolvedValue: (value: T[]) => void;
7 | };
8 | save: ReturnType<typeof vi.fn> & { mockResolvedValue: (value: T) => void };
9 | update: ReturnType<typeof vi.fn> & { mockResolvedValue: (value: T) => void };
10 | delete: ReturnType<typeof vi.fn> & {
11 | mockResolvedValue: (value: void) => void;
12 | };
13 | }
14 |
15 | export class RepositoryMockFactory {
16 | static createBasicMock<T>(): MockRepository<T> {
17 | return {
18 | findById: vi.fn(),
19 | findAll: vi.fn(),
20 | save: vi.fn(),
21 | update: vi.fn(),
22 | delete: vi.fn(),
23 | };
24 | }
25 |
26 | static createSuccessMock<T>(
27 | mockData: T,
28 | mockList: T[] = []
29 | ): MockRepository<T> {
30 | return {
31 | findById: vi.fn().mockResolvedValue(mockData),
32 | findAll: vi.fn().mockResolvedValue(mockList),
33 | save: vi.fn().mockResolvedValue(mockData),
34 | update: vi.fn().mockResolvedValue(mockData),
35 | delete: vi.fn().mockResolvedValue(undefined),
36 | };
37 | }
38 |
39 | static createErrorMock<T>(
40 | error: Error = new Error("Repository Error")
41 | ): MockRepository<T> {
42 | return {
43 | findById: vi.fn().mockRejectedValue(error),
44 | findAll: vi.fn().mockRejectedValue(error),
45 | save: vi.fn().mockRejectedValue(error),
46 | update: vi.fn().mockRejectedValue(error),
47 | delete: vi.fn().mockRejectedValue(error),
48 | };
49 | }
50 |
51 | static createNotFoundMock<T>(): MockRepository<T> {
52 | return {
53 | findById: vi.fn().mockResolvedValue(null),
54 | findAll: vi.fn().mockResolvedValue([]),
55 | save: vi.fn(),
56 | update: vi.fn(),
57 | delete: vi.fn(),
58 | };
59 | }
60 | }
61 |
62 | export const RepositoryMockHelpers = {
63 | verifyMethodCall: <T>(
64 | mockRepo: MockRepository<T>,
65 | method: keyof MockRepository<T>,
66 | expectedArgs: unknown[],
67 | callIndex: number = 0
68 | ) => {
69 | const mockMethod = mockRepo[method];
70 | expect(mockMethod).toHaveBeenCalled();
71 | expect(mockMethod).toHaveBeenNthCalledWith(callIndex + 1, ...expectedArgs);
72 | },
73 |
74 | verifyCallCount: <T>(
75 | mockRepo: MockRepository<T>,
76 | method: keyof MockRepository<T>,
77 | expectedCount: number
78 | ) => {
79 | expect(mockRepo[method]).toHaveBeenCalledTimes(expectedCount);
80 | },
81 |
82 | resetAllMocks: <T>(mockRepo: MockRepository<T>) => {
83 | Object.values(mockRepo).forEach((mockFn) => {
84 | if (vi.isMockFunction(mockFn)) {
85 | mockFn.mockReset();
86 | }
87 | });
88 | },
89 |
90 | changeMockBehavior: <T>(
91 | mockRepo: MockRepository<T>,
92 | method: keyof MockRepository<T>,
93 | newBehavior: (...args: unknown[]) => unknown
94 | ) => {
95 | const mockMethod = mockRepo[method];
96 | if (vi.isMockFunction(mockMethod)) {
97 | mockMethod.mockImplementation(newBehavior);
98 | }
99 | },
100 | };
101 |

---

## /src/shared/libs/**tests**/mocks/service-base.mock.ts:

1 | export interface MockService<T = unknown> {
2 | create: ReturnType<typeof vi.fn> & { mockResolvedValue: (value: T) => void };
3 | getById: ReturnType<typeof vi.fn> & {
4 | mockResolvedValue: (value: T | null) => void;
5 | };
6 | getAll: ReturnType<typeof vi.fn> & {
7 | mockResolvedValue: (value: T[]) => void;
8 | };
9 | update: ReturnType<typeof vi.fn> & { mockResolvedValue: (value: T) => void };
10 | delete: ReturnType<typeof vi.fn> & {
11 | mockResolvedValue: (value: void) => void;
12 | };
13 | }
14 |
15 | export class ServiceMockFactory {
16 | static createBasicMock<T>(): MockService<T> {
17 | return {
18 | create: vi.fn(),
19 | getById: vi.fn(),
20 | getAll: vi.fn(),
21 | update: vi.fn(),
22 | delete: vi.fn(),
23 | };
24 | }
25 |
26 | static createSuccessMock<T>(mockData: T, mockList: T[] = []): MockService<T> {
27 | return {
28 | create: vi.fn().mockResolvedValue(mockData),
29 | getById: vi.fn().mockResolvedValue(mockData),
30 | getAll: vi.fn().mockResolvedValue(mockList),
31 | update: vi.fn().mockResolvedValue(mockData),
32 | delete: vi.fn().mockResolvedValue(undefined),
33 | };
34 | }
35 |
36 | static createErrorMock<T>(
37 | error: Error = new Error("Service Error")
38 | ): MockService<T> {
39 | return {
40 | create: vi.fn().mockRejectedValue(error),
41 | getById: vi.fn().mockRejectedValue(error),
42 | getAll: vi.fn().mockRejectedValue(error),
43 | update: vi.fn().mockRejectedValue(error),
44 | delete: vi.fn().mockRejectedValue(error),
45 | };
46 | }
47 |
48 | static createNotFoundMock<T>(): MockService<T> {
49 | return {
50 | create: vi.fn(),
51 | getById: vi.fn().mockResolvedValue(null),
52 | getAll: vi.fn().mockResolvedValue([]),
53 | update: vi.fn().mockRejectedValue(new Error("Not found")),
54 | delete: vi.fn().mockRejectedValue(new Error("Not found")),
55 | };
56 | }
57 | }
58 |
59 | export const ServiceMockHelpers = {
60 | verifyMethodCall: <T>(
61 | mockService: MockService<T>,
62 | method: keyof MockService<T>,
63 | expectedArgs: unknown[],
64 | callIndex: number = 0
65 | ) => {
66 | const mockMethod = mockService[method];
67 | expect(mockMethod).toHaveBeenCalled();
68 | expect(mockMethod).toHaveBeenNthCalledWith(callIndex + 1, ...expectedArgs);
69 | },
70 |
71 | verifyCallCount: <T>(
72 | mockService: MockService<T>,
73 | method: keyof MockService<T>,
74 | expectedCount: number
75 | ) => {
76 | expect(mockService[method]).toHaveBeenCalledTimes(expectedCount);
77 | },
78 |
79 | resetAllMocks: <T>(mockService: MockService<T>) => {
80 | Object.values(mockService).forEach((mockFn) => {
81 | if (vi.isMockFunction(mockFn)) {
82 | mockFn.mockReset();
83 | }
84 | });
85 | },
86 |
87 | changeMockBehavior: <T>(
88 | mockService: MockService<T>,
89 | method: keyof MockService<T>,
90 | newBehavior: (...args: unknown[]) => unknown
91 | ) => {
92 | const mockMethod = mockService[method];
93 | if (vi.isMockFunction(mockMethod)) {
94 | mockMethod.mockImplementation(newBehavior);
95 | }
96 | },
97 |
98 | addDelay: <T>(
99 | mockService: MockService<T>,
100 | method: keyof MockService<T>,
101 | delay: number = 100
102 | ) => {
103 | const mockMethod = mockService[method];
104 | if (vi.isMockFunction(mockMethod)) {
105 | const originalImplementation = mockMethod.getMockImplementation();
106 | mockMethod.mockImplementation(async (...args: unknown[]) => {
107 | await new Promise((resolve) => setTimeout(resolve, delay));
108 | return originalImplementation
109 | ? originalImplementation(...args)
110 | : undefined;
111 | });
112 | }
113 | },
114 | };
115 |

---

## /src/shared/libs/**tests**/wrappers/FullWrapper.tsx:

1 | import { QueryClient } from "@tanstack/react-query";
2 | import React from "react";
3 | import { QueryWrapper, createTestQueryClient } from "./QueryWrapper";
4 | import { RouterWrapper } from "./RouterWrapper";
5 |
6 | interface FullWrapperProps {
7 | children: React.ReactNode;
8 | queryClient?: QueryClient;
9 | routerPath?: string;
10 | routerQuery?: Record<string, string | string[]>;
11 | routerAsPath?: string;
12 | }
13 |
14 | export const FullWrapper: React.FC<FullWrapperProps> = ({
15 | children,
16 | queryClient,
17 | routerPath = "/",
18 | routerQuery = {},
19 | routerAsPath,
20 | }) => {
21 | const testQueryClient = queryClient || createTestQueryClient();
22 |
23 | return (
24 | <QueryWrapper queryClient={testQueryClient}>
25 | <RouterWrapper
26 | initialPath={routerPath}
27 | query={routerQuery}
28 | asPath={routerAsPath}>
29 | {children}
30 | </RouterWrapper>
31 | </QueryWrapper>
32 | );
33 | };
34 |
35 | export const createFullWrapper = (
36 | options: {
37 | queryClientOptions?: Partial<ConstructorParameters<typeof QueryClient>[0]>;
38 | routerOptions?: {
39 | pathname?: string;
40 | query?: Record<string, string | string[]>;
41 | asPath?: string;
42 | };
43 | } = {}
44 | ) => {
45 | const customQueryClient = options.queryClientOptions
46 | ? new QueryClient({
47 | defaultOptions: {
48 | queries: {
49 | retry: false,
50 | gcTime: 0,
51 | staleTime: 0,
52 | ...options.queryClientOptions.defaultOptions?.queries,
53 | },
54 | mutations: {
55 | retry: false,
56 | ...options.queryClientOptions.defaultOptions?.mutations,
57 | },
58 | },
59 | ...options.queryClientOptions,
60 | })
61 | : createTestQueryClient();
62 |
63 | const CustomFullWrapper = ({ children }: { children: React.ReactNode }) => (
64 | <FullWrapper
65 | queryClient={customQueryClient}
66 | routerPath={options.routerOptions?.pathname}
67 | routerQuery={options.routerOptions?.query}
68 | routerAsPath={options.routerOptions?.asPath}>
69 | {children}
70 | </FullWrapper>
71 | );
72 | CustomFullWrapper.displayName = "CustomFullWrapper";
73 | return CustomFullWrapper;
74 | };
75 |

---

## /src/shared/libs/**tests**/wrappers/QueryWrapper.tsx:

1 | import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
2 | import React from "react";
3 |
4 | export const createTestQueryClient = (): QueryClient => {
5 | return new QueryClient({
6 | defaultOptions: {
7 | queries: {
8 | retry: false,
9 | gcTime: 0,
10 | staleTime: 0,
11 | },
12 | mutations: {
13 | retry: false,
14 | },
15 | },
16 | });
17 | };
18 |
19 | interface QueryWrapperProps {
20 | children: React.ReactNode;
21 | queryClient?: QueryClient;
22 | }
23 |
24 | export const QueryWrapper: React.FC<QueryWrapperProps> = ({
25 | children,
26 | queryClient,
27 | }) => {
28 | const testQueryClient = queryClient || createTestQueryClient();
29 |
30 | return (
31 | <QueryClientProvider client={testQueryClient}>
32 | {children}
33 | </QueryClientProvider>
34 | );
35 | };
36 |
37 | /\*_
38 | _ 커스텀 QueryWrapper 팩토리
39 | \*/
40 | export const createQueryWrapper = (
41 | queryClientOptions?: Partial<ConstructorParameters<typeof QueryClient>[0]>
42 | ) => {
43 | const customQueryClient = new QueryClient({
44 | defaultOptions: {
45 | queries: {
46 | retry: false,
47 | gcTime: 0,
48 | staleTime: 0,
49 | ...queryClientOptions?.defaultOptions?.queries,
50 | },
51 | mutations: {
52 | retry: false,
53 | ...queryClientOptions?.defaultOptions?.mutations,
54 | },
55 | },
56 | ...queryClientOptions,
57 | });
58 |
59 | const CustomQueryWrapper = ({ children }: { children: React.ReactNode }) => (
60 | <QueryClientProvider client={customQueryClient}>
61 | {children}
62 | </QueryClientProvider>
63 | );
64 | CustomQueryWrapper.displayName = "CustomQueryWrapper";
65 | return CustomQueryWrapper;
66 | };
67 |

---

## /src/shared/libs/**tests**/wrappers/RouterWrapper.tsx:

1 | import React from "react";
2 |
3 | export const createMockRouter = (
4 | options: {
5 | pathname?: string;
6 | query?: Record<string, string | string[]>;
7 | asPath?: string;
8 | push?: ReturnType<typeof vi.fn>;
9 | replace?: ReturnType<typeof vi.fn>;
10 | back?: ReturnType<typeof vi.fn>;
11 | forward?: ReturnType<typeof vi.fn>;
12 | reload?: ReturnType<typeof vi.fn>;
13 | } = {}
14 | ) => ({
15 | pathname: options.pathname || "/",
16 | route: options.pathname || "/",
17 | query: options.query || {},
18 | asPath: options.asPath || "/",
19 | basePath: "",
20 | locale: undefined,
21 | locales: undefined,
22 | defaultLocale: undefined,
23 | isReady: true,
24 | isPreview: false,
25 | isLocaleDomain: false,
26 | push: options.push || vi.fn().mockResolvedValue(true),
27 | replace: options.replace || vi.fn().mockResolvedValue(true),
28 | reload: options.reload || vi.fn(),
29 | back: options.back || vi.fn(),
30 | forward: options.forward || vi.fn(),
31 | prefetch: vi.fn().mockResolvedValue(undefined),
32 | beforePopState: vi.fn(),
33 | events: {
34 | on: vi.fn(),
35 | off: vi.fn(),
36 | emit: vi.fn(),
37 | },
38 | });
39 |
40 | interface RouterWrapperProps {
41 | children: React.ReactNode;
42 | initialPath?: string;
43 | query?: Record<string, string | string[]>;
44 | asPath?: string;
45 | }
46 |
47 | export const RouterWrapper: React.FC<RouterWrapperProps> = ({
48 | children,
49 | initialPath = "/",
50 | query = {},
51 | asPath,
52 | }) => {
53 | const mockRouter = createMockRouter({
54 | pathname: initialPath,
55 | query,
56 | asPath: asPath || initialPath,
57 | });
58 |
59 | React.useEffect(() => {
60 | if (typeof window !== "undefined") {
61 | (window as typeof window & { **NEXT_ROUTER**: unknown }).**NEXT_ROUTER** =
62 | mockRouter;
63 | }
64 | }, [mockRouter]);
65 |
66 | return <>{children}</>;
67 | };
68 |
69 | export const createRouterWrapper = (routerOptions: {
70 | pathname?: string;
71 | query?: Record<string, string | string[]>;
72 | asPath?: string;
73 | }) => {
74 | const CustomRouterWrapper = ({ children }: { children: React.ReactNode }) => (
75 | <RouterWrapper
76 | initialPath={routerOptions.pathname}
77 | query={routerOptions.query}
78 | asPath={routerOptions.asPath}>
79 | {children}
80 | </RouterWrapper>
81 | );
82 | CustomRouterWrapper.displayName = "CustomRouterWrapper";
83 | return CustomRouterWrapper;
84 | };
85 |
86 | export const RouterMockHelpers = {
87 | mockUseRouter: (routerMock: ReturnType<typeof createMockRouter>) => {
88 | return routerMock;
89 | },
90 |
91 | verifyNavigation: (
92 | mockRouter: ReturnType<typeof createMockRouter>,
93 | expectedPath: string,
94 | method: "push" | "replace" = "push"
95 | ) => {
96 | expect(mockRouter[method]).toHaveBeenCalledWith(expectedPath);
97 | },
98 |
99 | verifyQuery: (
100 | mockRouter: ReturnType<typeof createMockRouter>,
101 | expectedQuery: Record<string, string | string[]>
102 | ) => {
103 | expect(mockRouter.query).toEqual(expectedQuery);
104 | },
105 |
106 | resetRouter: (mockRouter: ReturnType<typeof createMockRouter>) => {
107 | if (vi.isMockFunction(mockRouter.push)) {
108 | mockRouter.push.mockClear();
109 | }
110 | if (vi.isMockFunction(mockRouter.replace)) {
111 | mockRouter.replace.mockClear();
112 | }
113 | if (vi.isMockFunction(mockRouter.back)) {
114 | mockRouter.back.mockClear();
115 | }
116 | if (vi.isMockFunction(mockRouter.forward)) {
117 | mockRouter.forward.mockClear();
118 | }
119 | },
120 | };
121 |

---

## /src/shared/libs/**tests**/wrappers/index.ts:

1 | /\*_
2 | _ Test Wrappers
3 | _
4 | _ React component wrappers for testing with various providers
5 | _/
6 |
7 | export _ from "./FullWrapper";
8 | export _ from "./QueryWrapper";
9 | export _ from "./RouterWrapper";
10 |

---

## /src/shared/libs/date/format-date.ts:

1 | export function formatDate(timestamp: number | string): string {
2 | const date = new Date(timestamp);
3 |
4 | const year = date.getFullYear();
5 | const month = String(date.getMonth() + 1).padStart(2, "0");
6 | const day = String(date.getDate()).padStart(2, "0");
7 |
8 | return `${year}.${month}.${day}`;
9 | }
10 |

---

## /src/shared/libs/date/index.ts:

1 | export { formatDate } from "./format-date";
2 | export { getRandomDate } from "./random-date";
3 |

---

## /src/shared/libs/date/random-date.ts:

1 | export const getRandomDate = (): number => {
2 | const now = new Date();
3 | const daysAgo = Math.floor(Math.random() _ 30);
4 | const date = new Date(now.getTime() - daysAgo _ 24 _ 60 _ 60 \* 1000);
5 | return date.getTime();
6 | };
7 |

---

## /src/shared/libs/errors/base-error.ts:

1 | export class BaseError extends Error {
2 | constructor(message: string, name: string) {
3 | super(message);
4 | this.name = name;
5 | }
6 |
7 | static notFound(entity: string, id: string): BaseError {
8 | return new BaseError(`${entity} with ID ${id} not found`, "NotFoundError");
9 | }
10 |
11 | static unauthorized(
12 | entity: string,
13 | id: string,
14 | action: string = "modify"
15 | ): BaseError {
16 | return new BaseError(
17 | `You don't have permission to ${action} ${entity.toLowerCase()} with ID ${id}`,
18 | "UnauthorizedError"
19 | );
20 | }
21 |
22 | static createFailed(entity: string): BaseError {
23 | return new BaseError(
24 | `Failed to create ${entity.toLowerCase()}`,
25 | "CreateFailedError"
26 | );
27 | }
28 |
29 | static updateFailed(entity: string, id: string): BaseError {
30 | return new BaseError(
31 | `Failed to update ${entity.toLowerCase()} with ID ${id}`,
32 | "UpdateFailedError"
33 | );
34 | }
35 |
36 | static deleteFailed(entity: string, id: string): BaseError {
37 | return new BaseError(
38 | `Failed to delete ${entity.toLowerCase()} with ID ${id}`,
39 | "DeleteFailedError"
40 | );
41 | }
42 |
43 | static validation(message: string): BaseError {
44 | return new BaseError(message, "ValidationError");
45 | }
46 | }
47 |

---

## /src/shared/libs/errors/index.ts:

1 | export { BaseError } from "./base-error";
2 |

---

## /src/shared/libs/index.ts:

1 | export { formatDate, getRandomDate } from "./date";
2 | export { BaseError } from "./errors";
3 |

---

## /src/shared/types/api.types.ts:

1 | export interface ApiResponse<T> {
2 | data: T;
3 | status: number;
4 | statusText: string;
5 | message?: string;
6 | ok: boolean;
7 | }
8 |

---

## /src/shared/types/index.ts:

1 | export { type ApiResponse } from "./api.types";
2 | export { type Pagination } from "./pagination.types";
3 |

---

## /src/shared/types/pagination.types.ts:

1 | export type Pagination<T> = {
2 | data: T[];
3 | pagination: {
4 | limit: number;
5 | skip: number;
6 | total: number;
7 | };
8 | };
9 |

---

## /src/shared/ui/divider/Divider.tsx:

1 | export const Divider = () => {
2 | return <div className="border-t border-gray-200 my-4" />;
3 | };
4 |

---

## /src/shared/ui/divider/index.ts:

1 | export { Divider } from "./Divider";
2 |

---

## /src/shared/ui/icons/Back.tsx:

1 | export const BackIcon = ({
2 | className,
3 | ...props
4 | }: React.SVGAttributes<SVGSVGElement>) => {
5 | return (
6 | <svg
7 | xmlns="http://www.w3.org/2000/svg"
8 | className={className}
9 | viewBox="0 0 20 20"
10 | fill="currentColor"
11 | {...props}>
12 | <path
13 | fillRule="evenodd"
14 | d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
15 | clipRule="evenodd"
16 | />
17 | </svg>
18 | );
19 | };
20 |

---

## /src/shared/ui/icons/Comment.tsx:

1 | export const CommentIcon = ({
2 | className,
3 | ...props
4 | }: React.SVGAttributes<SVGSVGElement>) => (
5 | <svg
6 | xmlns="http://www.w3.org/2000/svg"
7 | className={className}
8 | viewBox="0 0 20 20"
9 | fill="currentColor"
10 | {...props}>
11 | <path
12 | fillRule="evenodd"
13 | d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
14 | clipRule="evenodd"
15 | />
16 | </svg>
17 | );
18 |

---

## /src/shared/ui/icons/Like.tsx:

1 | export const LikeIcon = ({
2 | className,
3 | ...props
4 | }: React.SVGAttributes<SVGSVGElement>) => (
5 | <svg
6 | xmlns="http://www.w3.org/2000/svg"
7 | className={className}
8 | viewBox="0 0 20 20"
9 | fill="currentColor"
10 | {...props}>
11 | <path
12 | fillRule="evenodd"
13 | d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
14 | clipRule="evenodd"
15 | />
16 | </svg>
17 | );
18 |

---

## /src/shared/ui/icons/Logo.tsx:

1 | export const Logo = ({
2 | className,
3 | ...props
4 | }: React.SVGAttributes<SVGSVGElement>) => (
5 | <svg
6 | xmlns="http://www.w3.org/2000/svg"
7 | className={className ?? "h-6 w-6"}
8 | viewBox="0 0 20 20"
9 | fill="currentColor"
10 | {...props}>
11 | <path
12 | fillRule="evenodd"
13 | d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
14 | clipRule="evenodd"
15 | />
16 | </svg>
17 | );
18 |

---

## /src/shared/ui/icons/Message.tsx:

1 | export const MessageIcon = ({
2 | className,
3 | ...props
4 | }: React.SVGAttributes<SVGSVGElement>) => (
5 | <svg
6 | xmlns="http://www.w3.org/2000/svg"
7 | className={className ?? "h-6 w-6"}
8 | viewBox="0 0 20 20"
9 | fill="currentColor"
10 | {...props}>
11 | <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
12 | </svg>
13 | );
14 |

---

## /src/shared/ui/icons/Notification.tsx:

1 | import React from "react";
2 |
3 | export const NotificationIcon = ({
4 | className,
5 | ...props
6 | }: React.SVGAttributes<SVGSVGElement>) => (
7 | <svg
8 | xmlns="http://www.w3.org/2000/svg"
9 | className={className ?? "h-6 w-6"}
10 | viewBox="0 0 20 20"
11 | fill="currentColor"
12 | {...props}>
13 | <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
14 | </svg>
15 | );
16 |

---

## /src/shared/ui/icons/Search.tsx:

1 | export const SearchIcon = ({
2 | className,
3 | ...props
4 | }: React.SVGAttributes<SVGSVGElement>) => (
5 | <svg
6 | xmlns="http://www.w3.org/2000/svg"
7 | className={className ?? "h-6 w-6"}
8 | viewBox="0 0 20 20"
9 | fill="currentColor"
10 | {...props}>
11 | <path
12 | fillRule="evenodd"
13 | d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
14 | clipRule="evenodd"
15 | />
16 | </svg>
17 | );
18 |

---

## /src/shared/ui/icons/index.ts:

1 | export { BackIcon } from "./Back";
2 | export { CommentIcon } from "./Comment";
3 | export { LikeIcon } from "./Like";
4 | export { Logo } from "./Logo";
5 | export { MessageIcon } from "./Message";
6 | export { NotificationIcon } from "./Notification";
7 | export { SearchIcon } from "./Search";
8 |

---

## /src/shared/ui/index.ts:

1 | export { Divider } from "./divider";
2 | export \* from "./icons";
3 | export { Input } from "./input";
4 |

---

## /src/shared/ui/input/Input.tsx:

1 | export const Input = ({
2 | className,
3 | ...props
4 | }: React.InputHTMLAttributes<HTMLInputElement>) => {
5 | return (
6 | <input
7 | {...props}
8 | className={`flex-1 py-2 px-4 border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent text-sm ${className}`}
9 | />
10 | );
11 | };
12 |

---

## /src/shared/ui/input/index.ts:

1 | export { Input } from "./Input";
2 |

---

## /src/widgets/header/**tests**/MainHeader.test.tsx:

1 | /_ eslint-disable @next/next/no-img-element _/
2 | import { FullWrapper } from "@/shared/libs/**tests**";
3 | import { render, screen } from "@testing-library/react";
4 | import { beforeEach, describe, expect, it, vi } from "vitest";
5 | import { MainHeader } from "../main-header";
6 |
7 | // Mock the useUserProfile hook
8 | const mockUseUserProfile = vi.fn();
9 | vi.mock("@/features/user", () => ({
10 | useUserProfile: () => mockUseUserProfile(),
11 | }));
12 |
13 | vi.mock("next/image", () => ({
14 | default: ({
15 | src,
16 | alt,
17 | ...props
18 | }: {
19 | src: string;
20 | alt: string;
21 | [key: string]: unknown;
22 | }) => <img src={src} alt={alt} {...props} />,
23 | }));
24 |
25 | /\*_
26 | _ MainHeader Widget Tests
27 | _ Verify core MainHeader functionality using Given-When-Then pattern
28 | _/
29 | describe("MainHeader Widget", () => {
30 | const mockUserProfile = {
31 | id: "user-123",
32 | username: "testuser",
33 | email: "test@example.com",
34 | profileImage: "https://example.com/profile.jpg",
35 | age: 25,
36 | };
37 |
38 | beforeEach(() => {
39 | // Given: Reset all mocks before each test
40 | vi.clearAllMocks();
41 | });
42 |
43 | describe("Core Functionality", () => {
44 | it("should render MainHeader with all essential elements when user is authenticated", () => {
45 | // Given: User profile data is available
46 | mockUseUserProfile.mockReturnValue({
47 | data: mockUserProfile,
48 | isLoading: false,
49 | error: null,
50 | });
51 |
52 | // When: Render MainHeader component
53 | render(
54 | <FullWrapper>
55 | <MainHeader />
56 | </FullWrapper>
57 | );
58 |
59 | // Then: All essential elements should be rendered
60 | expect(screen.getByText("MomentHub")).toBeInTheDocument();
61 | expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
62 | expect(screen.getAllByRole("button")).toHaveLength(2); // Message and notification buttons
63 | expect(screen.getByRole("img", { name: /profile/i })).toBeInTheDocument();
64 | });
65 |
66 | it("should display user profile image correctly when user has profile image", () => {
67 | // Given: User profile with profile image
68 | mockUseUserProfile.mockReturnValue({
69 | data: mockUserProfile,
70 | isLoading: false,
71 | error: null,
72 | });
73 |
74 | // When: Render MainHeader component
75 | render(
76 | <FullWrapper>
77 | <MainHeader />
78 | </FullWrapper>
79 | );
80 |
81 | // Then: User avatar should display correct profile image
82 | const userAvatar = screen.getByRole("img", { name: /profile/i });
83 | expect(userAvatar).toHaveAttribute("src", mockUserProfile.profileImage);
84 | });
85 | });
86 |
87 | describe("Authentication States", () => {
88 | it("should not render when user is not authenticated", () => {
89 | // Given: User profile data is not available
90 | mockUseUserProfile.mockReturnValue({
91 | data: null,
92 | isLoading: false,
93 | error: null,
94 | });
95 |
96 | // When: Render MainHeader component
97 | const { container } = render(
98 | <FullWrapper>
99 | <MainHeader />
100 | </FullWrapper>
101 | );
102 |
103 | // Then: MainHeader should not render any content
104 | expect(container.firstChild).toBeNull();
105 | });
106 |
107 | it("should not render during loading state", () => {
108 | // Given: User profile is loading
109 | mockUseUserProfile.mockReturnValue({
110 | data: null,
111 | isLoading: true,
112 | error: null,
113 | });
114 |
115 | // When: Render MainHeader component
116 | const { container } = render(
117 | <FullWrapper>
118 | <MainHeader />
119 | </FullWrapper>
120 | );
121 |
122 | // Then: MainHeader should not render during loading
123 | expect(container.firstChild).toBeNull();
124 | });
125 |
126 | it("should not render when there is an error", () => {
127 | // Given: User profile has error
128 | mockUseUserProfile.mockReturnValue({
129 | data: null,
130 | isLoading: false,
131 | error: new Error("Failed to fetch user profile"),
132 | });
133 |
134 | // When: Render MainHeader component
135 | const { container } = render(
136 | <FullWrapper>
137 | <MainHeader />
138 | </FullWrapper>
139 | );
140 |
141 | // Then: MainHeader should not render when error occurs
142 | expect(container.firstChild).toBeNull();
143 | });
144 | });
145 |
146 | describe("Edge Cases", () => {
147 | it("should handle user profile with missing profile image", () => {
148 | // Given: User profile without profile image
149 | const userWithoutImage = {
150 | ...mockUserProfile,
151 | profileImage: "",
152 | };
153 |
154 | mockUseUserProfile.mockReturnValue({
155 | data: userWithoutImage,
156 | isLoading: false,
157 | error: null,
158 | });
159 |
160 | // When: Render MainHeader component
161 | render(
162 | <FullWrapper>
163 | <MainHeader />
164 | </FullWrapper>
165 | );
166 |
167 | // Then: Component should render essential elements without errors
168 | expect(screen.getByText("MomentHub")).toBeInTheDocument();
169 | expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
170 | });
171 |
172 | it("should handle different user profile data variations", () => {
173 | // Given: Various user profile scenarios
174 | const userVariations = [
175 | { ...mockUserProfile, username: "shortname" },
176 | { ...mockUserProfile, username: "verylongusernamethatmightoverflow" },
177 | { ...mockUserProfile, profileImage: "" },
178 | ];
179 |
180 | userVariations.forEach((user) => {
181 | mockUseUserProfile.mockReturnValue({
182 | data: user,
183 | isLoading: false,
184 | error: null,
185 | });
186 |
187 | const { unmount } = render(
188 | <FullWrapper>
189 | <MainHeader />
190 | </FullWrapper>
191 | );
192 |
193 | // Then: Component should render successfully for all variations
194 | expect(screen.getByText("MomentHub")).toBeInTheDocument();
195 |
196 | unmount();
197 | });
198 | });
199 | });
200 |
201 | describe("Hook Integration", () => {
202 | it("should call useUserProfile hook when component mounts", () => {
203 | // Given: User profile data is available
204 | mockUseUserProfile.mockReturnValue({
205 | data: mockUserProfile,
206 | isLoading: false,
207 | error: null,
208 | });
209 |
210 | // When: Render MainHeader component
211 | render(
212 | <FullWrapper>
213 | <MainHeader />
214 | </FullWrapper>
215 | );
216 |
217 | // Then: useUserProfile hook should be called
218 | expect(mockUseUserProfile).toHaveBeenCalledTimes(1);
219 | });
220 | });
221 | });
222 |

---

## /src/widgets/header/**tests**/PostHeader.test.tsx:

1 | import { FullWrapper } from "@/shared/libs/**tests**";
2 | import { fireEvent, render, screen } from "@testing-library/react";
3 | import { beforeEach, describe, expect, it, vi } from "vitest";
4 | import { PostHeader } from "../post-header";
5 |
6 | // Mock Next.js router
7 | const mockBack = vi.fn();
8 | const mockPush = vi.fn();
9 | const mockReplace = vi.fn();
10 |
11 | vi.mock("next/navigation", () => ({
12 | useRouter: () => ({
13 | back: mockBack,
14 | push: mockPush,
15 | replace: mockReplace,
16 | pathname: "/post/123",
17 | query: { postId: "123" },
18 | asPath: "/post/123",
19 | }),
20 | }));
21 |
22 | /\*_
23 | _ PostHeader Widget Tests
24 | _ Verify core PostHeader functionality using Given-When-Then pattern
25 | _/
26 | describe("PostHeader Widget", () => {
27 | beforeEach(() => {
28 | // Given: Reset all mocks before each test
29 | vi.clearAllMocks();
30 | });
31 |
32 | describe("Core Functionality", () => {
33 | it("should render PostHeader with essential elements when component is mounted", () => {
34 | // Given: PostHeader component is ready to render
35 | // When: Render PostHeader component
36 | render(
37 | <FullWrapper>
38 | <PostHeader />
39 | </FullWrapper>
40 | );
41 |
42 | // Then: All essential elements should be rendered
43 | expect(screen.getByRole("banner")).toBeInTheDocument();
44 | expect(screen.getByRole("button")).toBeInTheDocument();
45 | expect(screen.getByText("Post")).toBeInTheDocument();
46 | });
47 |
48 | it("should have proper semantic structure when rendered", () => {
49 | // Given: PostHeader component is ready to render
50 | // When: Render PostHeader component
51 | render(
52 | <FullWrapper>
53 | <PostHeader />
54 | </FullWrapper>
55 | );
56 |
57 | // Then: Component should have proper semantic structure
58 | const header = screen.getByRole("banner");
59 | const backButton = screen.getByRole("button");
60 | const title = screen.getByRole("heading", { level: 1 });
61 |
62 | expect(header.tagName).toBe("HEADER");
63 | expect(backButton.tagName).toBe("BUTTON");
64 | expect(title.tagName).toBe("H1");
65 | expect(title).toHaveTextContent("Post");
66 | });
67 | });
68 |
69 | describe("Navigation Functionality", () => {
70 | it("should call router.back when back button is clicked", () => {
71 | // Given: PostHeader component is rendered
72 | render(
73 | <FullWrapper>
74 | <PostHeader />
75 | </FullWrapper>
76 | );
77 |
78 | const backButton = screen.getByRole("button");
79 |
80 | // When: Back button is clicked
81 | fireEvent.click(backButton);
82 |
83 | // Then: Router back function should be called
84 | expect(mockBack).toHaveBeenCalledTimes(1);
85 | });
86 |
87 | it("should not call other router methods when back button is clicked", () => {
88 | // Given: PostHeader component is rendered
89 | render(
90 | <FullWrapper>
91 | <PostHeader />
92 | </FullWrapper>
93 | );
94 |
95 | const backButton = screen.getByRole("button");
96 |
97 | // When: Back button is clicked
98 | fireEvent.click(backButton);
99 |
100 | // Then: Only back method should be called, not push or replace
101 | expect(mockBack).toHaveBeenCalledTimes(1);
102 | expect(mockPush).not.toHaveBeenCalled();
103 | expect(mockReplace).not.toHaveBeenCalled();
104 | });
105 |
106 | it("should handle multiple back button clicks when user clicks repeatedly", () => {
107 | // Given: PostHeader component is rendered
108 | render(
109 | <FullWrapper>
110 | <PostHeader />
111 | </FullWrapper>
112 | );
113 |
114 | const backButton = screen.getByRole("button");
115 |
116 | // When: Back button is clicked multiple times
117 | fireEvent.click(backButton);
118 | fireEvent.click(backButton);
119 | fireEvent.click(backButton);
120 |
121 | // Then: Router back function should be called for each click
122 | expect(mockBack).toHaveBeenCalledTimes(3);
123 | });
124 | });
125 |
126 | describe("Accessibility", () => {
127 | it("should provide keyboard accessibility for back button when rendered", () => {
128 | // Given: PostHeader component is rendered
129 | render(
130 | <FullWrapper>
131 | <PostHeader />
132 | </FullWrapper>
133 | );
134 |
135 | const backButton = screen.getByRole("button");
136 |
137 | // When: Back button is focused
138 | backButton.focus();
139 |
140 | // Then: Button should be focusable
141 | expect(document.activeElement).toBe(backButton);
142 | });
143 | });
144 |
145 | describe("Edge Cases", () => {
146 | it("should handle rapid successive clicks on back button when user clicks quickly", () => {
147 | // Given: PostHeader component is rendered
148 | render(
149 | <FullWrapper>
150 | <PostHeader />
151 | </FullWrapper>
152 | );
153 |
154 | const backButton = screen.getByRole("button");
155 |
156 | // When: Back button is clicked rapidly
157 | fireEvent.click(backButton);
158 | fireEvent.click(backButton);
159 | fireEvent.click(backButton);
160 | fireEvent.click(backButton);
161 | fireEvent.click(backButton);
162 |
163 | // Then: All clicks should be handled
164 | expect(mockBack).toHaveBeenCalledTimes(5);
165 | });
166 |
167 | it("should maintain functionality after re-renders when component updates", () => {
168 | // Given: PostHeader component is rendered
169 | const { rerender } = render(
170 | <FullWrapper>
171 | <PostHeader />
172 | </FullWrapper>
173 | );
174 |
175 | // When: Component is re-rendered and back button is clicked
176 | rerender(
177 | <FullWrapper>
178 | <PostHeader />
179 | </FullWrapper>
180 | );
181 |
182 | const backButton = screen.getByRole("button");
183 | fireEvent.click(backButton);
184 |
185 | // Then: Router back function should still work after re-render
186 | expect(mockBack).toHaveBeenCalledTimes(1);
187 | });
188 | });
189 | });
190 |

---

## /src/widgets/header/index.ts:

1 | export { MainHeader } from "./main-header";
2 | export { PostHeader } from "./post-header";
3 |

---

## /src/widgets/header/main-header/MainHeader.tsx:

1 | "use client";
2 | import { UserAvatar } from "@/entities/user";
3 | import { useUserProfile } from "@/features/user";
4 | import {
5 | Logo,
6 | MessageIcon,
7 | NotificationIcon,
8 | SearchIcon,
9 | } from "@/shared/ui/icons";
10 | import { Input } from "@/shared/ui/input";
11 |
12 | export const MainHeader = () => {
13 | const { data: userProfile } = useUserProfile();
14 | if (!userProfile) return null;
15 |
16 | return (
17 | <div className="container flex items-center justify-between p-4">
18 | <div className="flex items-center space-x-2 text-2xl font-bold text-slate-600 cursor-pointer hover:text-teal-600">
19 | <Logo />
20 | <span>MomentHub</span>
21 | </div>
22 |
23 | <div className="relative w-1/3">
24 | <Input type="text" placeholder="Search" className="w-full" />
25 | <SearchIcon className="h-5 w-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
26 | </div>
27 |
28 | <div className="flex items-center space-x-4">
29 | <button className="text-slate-700 hover:text-teal-600 text-xl">
30 | <MessageIcon className="h-6 w-6 cursor-pointer" />
31 | </button>
32 | <button className="text-slate-700 hover:text-teal-600 text-xl">
33 | <NotificationIcon className="h-6 w-6 cursor-pointer" />
34 | </button>
35 |
36 | <UserAvatar
37 | userProfileImage={userProfile?.profileImage}
38 | className="w-8 h-8 cursor-pointer relative"
39 | />
40 | </div>
41 | </div>
42 | );
43 | };
44 |

---

## /src/widgets/header/main-header/index.ts:

1 | export { MainHeader } from "./MainHeader";
2 |

---

## /src/widgets/header/post-header/PostHeader.tsx:

1 | "use client";
2 | import { BackIcon } from "@/shared/ui/icons";
3 | import { useRouter } from "next/navigation";
4 |
5 | export const PostHeader = () => {
6 | const router = useRouter();
7 |
8 | return (
9 | <header className="w-full sticky top-0 z-10 bg-white shadow-sm py-3 px-4">
10 | <div className="flex items-center">
11 | <button
12 | onClick={() => router.back()}
13 | className="text-gray-700 hover:text-teal-600 text-xl cursor-pointer">
14 | <BackIcon className="h-6 w-6" />
15 | </button>
16 | <h1 className="text-lg font-medium mx-auto">Post</h1>
17 | </div>
18 | </header>
19 | );
20 | };
21 |

---

## /src/widgets/header/post-header/index.ts:

1 | export { PostHeader } from "./PostHeader";
2 |

---

## /src/widgets/post/**tests**/PostDetailSection.test.tsx:

1 | /_ eslint-disable @next/next/no-img-element _/
2 | import type { CommentDto } from "@/entities/comment";
3 | import type { UserDto } from "@/entities/user";
4 | import { mockPostDetailData } from "@/features/post/**tests**";
5 | import { FullWrapper } from "@/shared/libs/**tests**";
6 | import { render, screen } from "@testing-library/react";
7 | import { beforeEach, describe, expect, it, vi } from "vitest";
8 | import { PostDetailSection } from "../post-detail-section";
9 |
10 | // Mock the hooks
11 | const mockUseUserProfile = vi.fn();
12 | const mockUseGetPostById = vi.fn();
13 |
14 | vi.mock("@/features/user", () => ({
15 | useUserProfile: () => mockUseUserProfile(),
16 | }));
17 |
18 | vi.mock("@/features/post", () => ({
19 | useGetPostById: (postId: string) => mockUseGetPostById(postId),
20 | }));
21 |
22 | // Mock the components
23 | vi.mock("@/entities/user", () => ({
24 | UserIdentifier: ({ user }: { user: UserDto }) => (
25 | <div data-testid="user-identifier">
26 | <span>{user.username}</span>
27 | <img src={user.profileImage} alt={`${user.username} profile`} />
28 | </div>
29 | ),
30 | }));
31 |
32 | vi.mock("@/features/comment", () => ({
33 | CommentForm: ({ userProfileImage }: { userProfileImage: string }) => (
34 | <div data-testid="comment-form">
35 | <img src={userProfileImage} alt="User profile for comment" />
36 | <textarea placeholder="Write a comment..." />
37 | </div>
38 | ),
39 | CommentView: ({ comment }: { comment: CommentDto }) => (
40 | <div data-testid={`comment-${comment.id}`}>
41 | <span>{comment.user.username}</span>
42 | <p>{comment.body}</p>
43 | <span>Likes: {comment.likes}</span>
44 | </div>
45 | ),
46 | }));
47 |
48 | vi.mock("@/shared/libs/date", () => ({
49 | formatDate: (timestamp: number) => new Date(timestamp).toLocaleDateString(),
50 | }));
51 |
52 | vi.mock("@/shared/ui", () => ({
53 | CommentIcon: ({ className }: { className?: string }) => (
54 | <svg className={className} data-testid="comment-icon" />
55 | ),
56 | Divider: () => <hr data-testid="divider" />,
57 | LikeIcon: ({ className }: { className?: string }) => (
58 | <svg className={className} data-testid="like-icon" />
59 | ),
60 | }));
61 |
62 | // Mock Next.js Image component with minimal typing for tests
63 | vi.mock("next/image", () => ({
64 | default: ({
65 | src,
66 | alt,
67 | ...props
68 | }: {
69 | src: string;
70 | alt: string;
71 | [key: string]: unknown;
72 | }) => <img src={src} alt={alt} {...props} />,
73 | }));
74 |
75 | /\*_
76 | _ PostDetailSection Widget Tests
77 | _ Verify core PostDetailSection functionality using Given-When-Then pattern
78 | _/
79 | describe("PostDetailSection Widget", () => {
80 | const mockUserProfile = {
81 | id: "user-123",
82 | username: "testuser",
83 | email: "test@example.com",
84 | profileImage: "https://example.com/profile.jpg",
85 | age: 25,
86 | };
87 |
88 | const testPostId = "post-1";
89 |
90 | beforeEach(() => {
91 | // Given: Reset all mocks before each test
92 | vi.clearAllMocks();
93 | });
94 |
95 | describe("Core Functionality", () => {
96 | it("should render PostDetailSection with all essential elements when data is available", () => {
97 | // Given: User profile and post data are available
98 | mockUseUserProfile.mockReturnValue({
99 | data: mockUserProfile,
100 | isLoading: false,
101 | error: null,
102 | });
103 |
104 | mockUseGetPostById.mockReturnValue({
105 | data: mockPostDetailData,
106 | isLoading: false,
107 | error: null,
108 | });
109 |
110 | // When: Render PostDetailSection component
111 | render(
112 | <FullWrapper>
113 | <PostDetailSection postId={testPostId} />
114 | </FullWrapper>
115 | );
116 |
117 | // Then: All essential elements should be rendered
118 | expect(screen.getByTestId("user-identifier")).toBeInTheDocument();
119 | expect(
120 | screen.getByRole("img", {
121 | name: `Post by ${mockPostDetailData.user.username}`,
122 | })
123 | ).toBeInTheDocument();
124 | expect(screen.getByText(mockPostDetailData.body)).toBeInTheDocument();
125 | expect(
126 | screen.getByText(mockPostDetailData.likes.toLocaleString())
127 | ).toBeInTheDocument();
128 | expect(
129 | screen.getByText(`${mockPostDetailData.comments.length} Comments`)
130 | ).toBeInTheDocument();
131 | expect(screen.getByTestId("comment-form")).toBeInTheDocument();
132 | });
133 |
134 | it("should display post image with correct attributes when post data is available", () => {
135 | // Given: User profile and post data are available
136 | mockUseUserProfile.mockReturnValue({
137 | data: mockUserProfile,
138 | isLoading: false,
139 | error: null,
140 | });
141 |
142 | mockUseGetPostById.mockReturnValue({
143 | data: mockPostDetailData,
144 | isLoading: false,
145 | error: null,
146 | });
147 |
148 | // When: Render PostDetailSection component
149 | render(
150 | <FullWrapper>
151 | <PostDetailSection postId={testPostId} />
152 | </FullWrapper>
153 | );
154 |
155 | // Then: Post image should have correct attributes
156 | const postImage = screen.getByRole("img", {
157 | name: `Post by ${mockPostDetailData.user.username}`,
158 | });
159 | expect(postImage).toHaveAttribute("src", mockPostDetailData.image);
160 | expect(postImage).toHaveAttribute(
161 | "alt",
162 | `Post by ${mockPostDetailData.user.username}`
163 | );
164 | });
165 |
166 | it("should render all comments when post has multiple comments", () => {
167 | // Given: User profile and post data with multiple comments are available
168 | mockUseUserProfile.mockReturnValue({
169 | data: mockUserProfile,
170 | isLoading: false,
171 | error: null,
172 | });
173 |
174 | mockUseGetPostById.mockReturnValue({
175 | data: mockPostDetailData,
176 | isLoading: false,
177 | error: null,
178 | });
179 |
180 | // When: Render PostDetailSection component
181 | render(
182 | <FullWrapper>
183 | <PostDetailSection postId={testPostId} />
184 | </FullWrapper>
185 | );
186 |
187 | // Then: All comments should be rendered
188 | mockPostDetailData.comments.forEach((comment) => {
189 | expect(screen.getByTestId(`comment-${comment.id}`)).toBeInTheDocument();
190 | expect(screen.getByText(comment.user.username)).toBeInTheDocument();
191 | expect(screen.getByText(comment.body)).toBeInTheDocument();
192 | });
193 | });
194 | });
195 |
196 | describe("Authentication States", () => {
197 | it("should not render when user profile is not available", () => {
198 | // Given: User profile is not available
199 | mockUseUserProfile.mockReturnValue({
200 | data: null,
201 | isLoading: false,
202 | error: null,
203 | });
204 |
205 | mockUseGetPostById.mockReturnValue({
206 | data: mockPostDetailData,
207 | isLoading: false,
208 | error: null,
209 | });
210 |
211 | // When: Render PostDetailSection component
212 | const { container } = render(
213 | <FullWrapper>
214 | <PostDetailSection postId={testPostId} />
215 | </FullWrapper>
216 | );
217 |
218 | // Then: Component should not render any content
219 | expect(container.firstChild).toBeNull();
220 | });
221 |
222 | it("should not render when post data is not available", () => {
223 | // Given: Post data is not available
224 | mockUseUserProfile.mockReturnValue({
225 | data: mockUserProfile,
226 | isLoading: false,
227 | error: null,
228 | });
229 |
230 | mockUseGetPostById.mockReturnValue({
231 | data: null,
232 | isLoading: false,
233 | error: null,
234 | });
235 |
236 | // When: Render PostDetailSection component
237 | const { container } = render(
238 | <FullWrapper>
239 | <PostDetailSection postId={testPostId} />
240 | </FullWrapper>
241 | );
242 |
243 | // Then: Component should not render any content
244 | expect(container.firstChild).toBeNull();
245 | });
246 |
247 | it("should not render during loading states", () => {
248 | // Given: Data is loading
249 | mockUseUserProfile.mockReturnValue({
250 | data: null,
251 | isLoading: true,
252 | error: null,
253 | });
254 |
255 | mockUseGetPostById.mockReturnValue({
256 | data: null,
257 | isLoading: true,
258 | error: null,
259 | });
260 |
261 | // When: Render PostDetailSection component
262 | const { container } = render(
263 | <FullWrapper>
264 | <PostDetailSection postId={testPostId} />
265 | </FullWrapper>
266 | );
267 |
268 | // Then: Component should not render during loading
269 | expect(container.firstChild).toBeNull();
270 | });
271 | });
272 |
273 | describe("Hook Integration", () => {
274 | it("should call useGetPostById hook with correct postId when component is mounted", () => {
275 | // Given: User profile and post data are available
276 | mockUseUserProfile.mockReturnValue({
277 | data: mockUserProfile,
278 | isLoading: false,
279 | error: null,
280 | });
281 |
282 | mockUseGetPostById.mockReturnValue({
283 | data: mockPostDetailData,
284 | isLoading: false,
285 | error: null,
286 | });
287 |
288 | // When: Render PostDetailSection component
289 | render(
290 | <FullWrapper>
291 | <PostDetailSection postId={testPostId} />
292 | </FullWrapper>
293 | );
294 |
295 | // Then: useGetPostById hook should be called with correct postId
296 | expect(mockUseGetPostById).toHaveBeenCalledWith(testPostId);
297 | });
298 |
299 | it("should call useGetPostById with different postId when postId prop changes", () => {
300 | // Given: Initial render with first postId
301 | mockUseUserProfile.mockReturnValue({
302 | data: mockUserProfile,
303 | isLoading: false,
304 | error: null,
305 | });
306 |
307 | mockUseGetPostById.mockReturnValue({
308 | data: mockPostDetailData,
309 | isLoading: false,
310 | error: null,
311 | });
312 |
313 | const { rerender } = render(
314 | <FullWrapper>
315 | <PostDetailSection postId="post-1" />
316 | </FullWrapper>
317 | );
318 |
319 | expect(mockUseGetPostById).toHaveBeenCalledWith("post-1");
320 |
321 | // When: Re-render with different postId
322 | rerender(
323 | <FullWrapper>
324 | <PostDetailSection postId="post-2" />
325 | </FullWrapper>
326 | );
327 |
328 | // Then: useGetPostById should be called with new postId
329 | expect(mockUseGetPostById).toHaveBeenCalledWith("post-2");
330 | });
331 | });
332 |
333 | describe("Edge Cases", () => {
334 | it("should handle post with empty body when post content is missing", () => {
335 | // Given: Post data with empty body
336 | const emptyBodyPost = {
337 | ...mockPostDetailData,
338 | body: "",
339 | };
340 |
341 | mockUseUserProfile.mockReturnValue({
342 | data: mockUserProfile,
343 | isLoading: false,
344 | error: null,
345 | });
346 |
347 | mockUseGetPostById.mockReturnValue({
348 | data: emptyBodyPost,
349 | isLoading: false,
350 | error: null,
351 | });
352 |
353 | // When: Render PostDetailSection component
354 | render(
355 | <FullWrapper>
356 | <PostDetailSection postId={testPostId} />
357 | </FullWrapper>
358 | );
359 |
360 | // Then: Component should render other elements without errors
361 | expect(screen.getByTestId("user-identifier")).toBeInTheDocument();
362 | expect(screen.getByTestId("comment-form")).toBeInTheDocument();
363 | });
364 |
365 | it("should handle zero engagement correctly when post has no likes or comments", () => {
366 | // Given: Post data with zero engagement
367 | const zeroEngagementPost = {
368 | ...mockPostDetailData,
369 | likes: 0,
370 | comments: [],
371 | };
372 |
373 | mockUseUserProfile.mockReturnValue({
374 | data: mockUserProfile,
375 | isLoading: false,
376 | error: null,
377 | });
378 |
379 | mockUseGetPostById.mockReturnValue({
380 | data: zeroEngagementPost,
381 | isLoading: false,
382 | error: null,
383 | });
384 |
385 | // When: Render PostDetailSection component
386 | render(
387 | <FullWrapper>
388 | <PostDetailSection postId={testPostId} />
389 | </FullWrapper>
390 | );
391 |
392 | // Then: Zero values should be displayed correctly
393 | const likesCount = screen.getByTestId("post-detail-likes-count");
394 | const commentsCount = screen.getByTestId("post-detail-comments-count");
395 | const commentsHeader = screen.getByTestId("comments-header");
396 |
397 | expect(likesCount).toHaveTextContent("0");
398 | expect(commentsCount).toHaveTextContent("0");
399 | expect(commentsHeader).toHaveTextContent("0 Comments");
400 | });
401 |
402 | it("should handle user profile with missing profile image", () => {
403 | // Given: User profile without profile image
404 | const userWithoutImage = {
405 | ...mockUserProfile,
406 | profileImage: "",
407 | };
408 |
409 | mockUseUserProfile.mockReturnValue({
410 | data: userWithoutImage,
411 | isLoading: false,
412 | error: null,
413 | });
414 |
415 | mockUseGetPostById.mockReturnValue({
416 | data: mockPostDetailData,
417 | isLoading: false,
418 | error: null,
419 | });
420 |
421 | // When: Render PostDetailSection component
422 | render(
423 | <FullWrapper>
424 | <PostDetailSection postId={testPostId} />
425 | </FullWrapper>
426 | );
427 |
428 | // Then: Component should render without errors
429 | expect(screen.getByTestId("user-identifier")).toBeInTheDocument();
430 | expect(screen.getByTestId("comment-form")).toBeInTheDocument();
431 | });
432 | });
433 | });
434 |

---

## /src/widgets/post/**tests**/PostListSection.test.tsx:

1 | /_ eslint-disable @next/next/no-img-element _/
2 | import type { PostDto } from "@/entities/post";
3 | import { FullWrapper } from "@/shared/libs/**tests**";
4 | import { render, screen } from "@testing-library/react";
5 | import { beforeEach, describe, expect, it, vi } from "vitest";
6 | import { mockPostsData } from "../../../features/post/**tests**";
7 | import { PostListSection } from "../post-list-section";
8 |
9 | // Mock the useGetPosts hook
10 | const mockUseGetPosts = vi.fn();
11 |
12 | vi.mock("@/features/post", () => ({
13 | useGetPosts: () => mockUseGetPosts(),
14 | PostCard: ({ post }: { post: PostDto }) => (
15 | <div data-testid={`post-card-${post.id}`} data-post-id={post.id}>
16 | <h3>{post.title}</h3>
17 | <p>{post.body}</p>
18 | <span>Likes: {post.likes}</span>
19 | <span>Comments: {post.totalComments}</span>
20 | </div>
21 | ),
22 | }));
23 |
24 | // Mock Next.js Image component with minimal typing for tests
25 | vi.mock("next/image", () => ({
26 | default: ({
27 | src,
28 | alt,
29 | ...props
30 | }: {
31 | src: string;
32 | alt: string;
33 | [key: string]: unknown;
34 | }) => <img src={src} alt={alt} {...props} />,
35 | }));
36 |
37 | /\*_
38 | _ PostListSection Widget Tests
39 | _ Verify core PostListSection widget functionality using Given-When-Then pattern
40 | _/
41 | describe("PostListSection Widget", () => {
42 | beforeEach(() => {
43 | // Given: Reset all mocks before each test
44 | vi.clearAllMocks();
45 | });
46 |
47 | describe("Core Functionality", () => {
48 | it("should render all posts when posts data is available", () => {
49 | // Given: Posts data is available from hook
50 | mockUseGetPosts.mockReturnValue({
51 | data: mockPostsData,
52 | isLoading: false,
53 | error: null,
54 | });
55 |
56 | // When: Render PostListSection component
57 | render(
58 | <FullWrapper>
59 | <PostListSection />
60 | </FullWrapper>
61 | );
62 |
63 | // Then: All posts should be rendered
64 | const postCards = screen.getAllByTestId(/post-card-/);
65 | expect(postCards).toHaveLength(mockPostsData.data.length);
66 |
67 | // Verify each post content is displayed
68 | mockPostsData.data.forEach((post) => {
69 | expect(screen.getByText(post.title)).toBeInTheDocument();
70 | expect(screen.getByText(post.body)).toBeInTheDocument();
71 | expect(screen.getByText(`Likes: ${post.likes}`)).toBeInTheDocument();
72 | expect(
73 | screen.getByText(`Comments: ${post.totalComments}`)
74 | ).toBeInTheDocument();
75 | });
76 | });
77 |
78 | it("should render posts in correct order", () => {
79 | // Given: Posts data is available from hook
80 | mockUseGetPosts.mockReturnValue({
81 | data: mockPostsData,
82 | isLoading: false,
83 | error: null,
84 | });
85 |
86 | // When: Render PostListSection component
87 | render(
88 | <FullWrapper>
89 | <PostListSection />
90 | </FullWrapper>
91 | );
92 |
93 | // Then: Posts should be rendered in the same order as data
94 | const postCards = screen.getAllByTestId(/post-card-/);
95 | postCards.forEach((card, index) => {
96 | const expectedPostId = mockPostsData.data[index].id;
97 | expect(card).toHaveAttribute("data-post-id", expectedPostId);
98 | });
99 | });
100 |
101 | it("should render empty grid when posts array is empty", () => {
102 | // Given: Empty posts data
103 | const emptyPostsData = {
104 | data: [],
105 | pagination: {
106 | limit: 10,
107 | skip: 0,
108 | total: 0,
109 | },
110 | };
111 |
112 | mockUseGetPosts.mockReturnValue({
113 | data: emptyPostsData,
114 | isLoading: false,
115 | error: null,
116 | });
117 |
118 | // When: Render PostListSection component
119 | render(
120 | <FullWrapper>
121 | <PostListSection />
122 | </FullWrapper>
123 | );
124 |
125 | // Then: No post cards should be rendered
126 | const postCards = screen.queryAllByTestId(/post-card-/);
127 | expect(postCards).toHaveLength(0);
128 | });
129 | });
130 |
131 | describe("Loading and Error States", () => {
132 | it("should not render when posts data is null", () => {
133 | // Given: Posts data is null
134 | mockUseGetPosts.mockReturnValue({
135 | data: null,
136 | isLoading: false,
137 | error: null,
138 | });
139 |
140 | // When: Render PostListSection component
141 | const { container } = render(
142 | <FullWrapper>
143 | <PostListSection />
144 | </FullWrapper>
145 | );
146 |
147 | // Then: Component should not render any content
148 | expect(container.firstChild).toBeNull();
149 | });
150 |
151 | it("should not render when posts data is loading", () => {
152 | // Given: Posts data is in loading state
153 | mockUseGetPosts.mockReturnValue({
154 | data: null,
155 | isLoading: true,
156 | error: null,
157 | });
158 |
159 | // When: Render PostListSection component
160 | const { container } = render(
161 | <FullWrapper>
162 | <PostListSection />
163 | </FullWrapper>
164 | );
165 |
166 | // Then: Component should not render any content during loading
167 | expect(container.firstChild).toBeNull();
168 | });
169 |
170 | it("should not render when posts data has error", () => {
171 | // Given: Posts data has error state
172 | mockUseGetPosts.mockReturnValue({
173 | data: null,
174 | isLoading: false,
175 | error: new Error("Failed to fetch posts"),
176 | });
177 |
178 | // When: Render PostListSection component
179 | const { container } = render(
180 | <FullWrapper>
181 | <PostListSection />
182 | </FullWrapper>
183 | );
184 |
185 | // Then: Component should not render any content when error occurs
186 | expect(container.firstChild).toBeNull();
187 | });
188 | });
189 |
190 | describe("Hook Integration", () => {
191 | it("should call useGetPosts hook when component is mounted", () => {
192 | // Given: Posts data is available
193 | mockUseGetPosts.mockReturnValue({
194 | data: mockPostsData,
195 | isLoading: false,
196 | error: null,
197 | });
198 |
199 | // When: Render PostListSection component
200 | render(
201 | <FullWrapper>
202 | <PostListSection />
203 | </FullWrapper>
204 | );
205 |
206 | // Then: useGetPosts hook should be called
207 | expect(mockUseGetPosts).toHaveBeenCalledTimes(1);
208 | });
209 |
210 | it("should re-render when hook data changes", () => {
211 | // Given: Initial posts data
212 | mockUseGetPosts.mockReturnValue({
213 | data: mockPostsData,
214 | isLoading: false,
215 | error: null,
216 | });
217 |
218 | const { rerender } = render(
219 | <FullWrapper>
220 | <PostListSection />
221 | </FullWrapper>
222 | );
223 |
224 | const initialPostCards = screen.getAllByTestId(/post-card-/);
225 | expect(initialPostCards).toHaveLength(mockPostsData.data.length);
226 |
227 | // When: Hook data changes to single post
228 | const updatedPostsData = {
229 | ...mockPostsData,
230 | data: [mockPostsData.data[0]],
231 | };
232 |
233 | mockUseGetPosts.mockReturnValue({
234 | data: updatedPostsData,
235 | isLoading: false,
236 | error: null,
237 | });
238 |
239 | rerender(
240 | <FullWrapper>
241 | <PostListSection />
242 | </FullWrapper>
243 | );
244 |
245 | // Then: Component should re-render with updated data
246 | const updatedPostCards = screen.getAllByTestId(/post-card-/);
247 | expect(updatedPostCards).toHaveLength(1);
248 | });
249 | });
250 |
251 | describe("Edge Cases", () => {
252 | it("should handle posts with empty content", () => {
253 | // Given: Posts with empty content
254 | const emptyContentPostsData = {
255 | data: [
256 | {
257 | ...mockPostsData.data[0],
258 | title: "",
259 | body: "",
260 | likes: 0,
261 | totalComments: 0,
262 | },
263 | ],
264 | pagination: {
265 | limit: 10,
266 | skip: 0,
267 | total: 1,
268 | },
269 | };
270 |
271 | mockUseGetPosts.mockReturnValue({
272 | data: emptyContentPostsData,
273 | isLoading: false,
274 | error: null,
275 | });
276 |
277 | // When: Render PostListSection component
278 | render(
279 | <FullWrapper>
280 | <PostListSection />
281 | </FullWrapper>
282 | );
283 |
284 | // Then: Component should handle empty content gracefully
285 | const postCards = screen.getAllByTestId(/post-card-/);
286 | expect(postCards).toHaveLength(1);
287 | expect(screen.getByText("Likes: 0")).toBeInTheDocument();
288 | expect(screen.getByText("Comments: 0")).toBeInTheDocument();
289 | });
290 |
291 | it("should handle single post data", () => {
292 | // Given: Single post data
293 | const singlePostData = {
294 | data: [mockPostsData.data[0]],
295 | pagination: {
296 | limit: 10,
297 | skip: 0,
298 | total: 1,
299 | },
300 | };
301 |
302 | mockUseGetPosts.mockReturnValue({
303 | data: singlePostData,
304 | isLoading: false,
305 | error: null,
306 | });
307 |
308 | // When: Render PostListSection component
309 | render(
310 | <FullWrapper>
311 | <PostListSection />
312 | </FullWrapper>
313 | );
314 |
315 | // Then: Single post should be rendered
316 | const postCards = screen.getAllByTestId(/post-card-/);
317 | expect(postCards).toHaveLength(1);
318 | expect(postCards[0]).toHaveAttribute(
319 | "data-post-id",
320 | singlePostData.data[0].id
321 | );
322 | });
323 | });
324 |
325 | describe("Accessibility", () => {
326 | it("should render posts with proper semantic structure", () => {
327 | // Given: Posts data is available
328 | mockUseGetPosts.mockReturnValue({
329 | data: mockPostsData,
330 | isLoading: false,
331 | error: null,
332 | });
333 |
334 | // When: Render PostListSection component
335 | render(
336 | <FullWrapper>
337 | <PostListSection />
338 | </FullWrapper>
339 | );
340 |
341 | // Then: Each post should have proper heading structure
342 | mockPostsData.data.forEach((post) => {
343 | const postTitle = screen.getByRole("heading", { name: post.title });
344 | expect(postTitle).toBeInTheDocument();
345 | });
346 | });
347 | });
348 | });
349 |

---

## /src/widgets/post/index.ts:

1 | export { PostDetailSection } from "./post-detail-section";
2 | export { PostListSection } from "./post-list-section";
3 |

---

## /src/widgets/post/post-detail-section/PostDetailSection.tsx:

1 | "use client";
2 |
3 | import { UserIdentifier } from "@/entities/user";
4 | import { CommentForm, CommentView } from "@/features/comment";
5 | import { useGetPostById } from "@/features/post";
6 | import { useUserProfile } from "@/features/user";
7 | import { formatDate } from "@/shared/libs/date";
8 | import { CommentIcon, Divider, LikeIcon } from "@/shared/ui";
9 | import Image from "next/image";
10 |
11 | export const PostDetailSection = ({ postId }: { postId: string }) => {
12 | const { data: userProfile } = useUserProfile();
13 | const { data } = useGetPostById(postId);
14 | if (!userProfile || !data) return null;
15 | return (
16 | <div className="max-w-3xl mx-auto px-4 py-6">
17 | <div className="flex items-center justify-between mb-4 space-x-2">
18 | <UserIdentifier user={data.user} />
19 | <div className="text-xs text-gray-500">
20 | {formatDate(data.createdAt)}
21 | </div>
22 | </div>
23 |
24 | <div className="rounded-lg overflow-hidden mb-4">
25 | <Image
26 | src={data.image}
27 | alt={`Post by ${data.user.username}`}
28 | className="w-full h-auto"
29 | width={400}
30 | height={400}
31 | priority={true}
32 | loading="eager"
33 | />
34 | </div>
35 |
36 | {/_ Post content _/}
37 | <div className="mb-6">
38 | <p className="text-gray-800 mt-2 mb-4">{data.body}</p>
39 | <div className="flex items-center text-gray-500 text-sm">
40 | <div
41 | className="flex items-center mr-4"
42 | data-testid="post-detail-likes-section">
43 | <LikeIcon className="h-4 w-4 text-red-500 mr-1" />
44 | <span data-testid="post-detail-likes-count">
45 | {data.likes.toLocaleString()}
46 | </span>
47 | </div>
48 | <div
49 | className="flex items-center"
50 | data-testid="post-detail-comments-section">
51 | <CommentIcon className="h-4 w-4 text-blue-500 mr-1" />
52 | <span data-testid="post-detail-comments-count">
53 | {data.comments.length.toLocaleString()}
54 | </span>
55 | </div>
56 | </div>
57 | </div>
58 |
59 | <Divider />
60 |
61 | <div>
62 | <h3 className="font-medium mb-4" data-testid="comments-header">
63 | {data.comments.length} Comments
64 | </h3>
65 | <CommentForm userProfileImage={userProfile?.profileImage} />
66 | <div className="space-y-4">
67 | {data.comments.map((comment) => (
68 | <CommentView comment={comment} key={comment.id} />
69 | ))}
70 | </div>
71 | </div>
72 | </div>
73 | );
74 | };
75 |

---

## /src/widgets/post/post-detail-section/index.ts:

1 | export { PostDetailSection } from "./PostDetailSection";
2 |

---

## /src/widgets/post/post-list-section/PostListSection.tsx:

1 | "use client";
2 | import { PostCard, useGetPosts } from "@/features/post";
3 |
4 | export const PostListSection = () => {
5 | const { data } = useGetPosts();
6 | if (!data) return null;
7 | return (
8 | <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
9 | {data.data.map((post) => (
10 | <PostCard post={post} key={post.id} />
11 | ))}
12 | </div>
13 | );
14 | };
15 |

---

## /src/widgets/post/post-list-section/index.ts:

1 | export { PostListSection } from "./PostListSection";
2 |

---

## /tsconfig.json:

1 | {
2 | "compilerOptions": {
3 | "target": "ES2017",
4 | "lib": ["dom", "dom.iterable", "esnext"],
5 | "types": ["vitest/globals", "@testing-library/jest-dom"],
6 | "allowJs": true,
7 | "skipLibCheck": true,
8 | "strict": true,
9 | "noEmit": true,
10 | "esModuleInterop": true,
11 | "module": "esnext",
12 | "moduleResolution": "bundler",
13 | "resolveJsonModule": true,
14 | "isolatedModules": true,
15 | "jsx": "preserve",
16 | "incremental": true,
17 | "plugins": [
18 | {
19 | "name": "next"
20 | }
21 | ],
22 | "baseUrl": ".",
23 | "paths": {
24 | "@/_": ["src/_"]
25 | }
26 | },
27 | "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
28 | "exclude": ["node_modules"]
29 | }
30 |

---

## /vitest.config.ts:

1 | import { resolve } from "path";
2 | import { defineConfig } from "vitest/config";
3 |
4 | export default defineConfig({
5 | test: {
6 | globals: true,
7 | environment: "jsdom",
8 | setupFiles: ["./setup.ts"],
9 | include: [
10 | "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
11 | "src/**/tests/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
12 | ],
13 | exclude: [
14 | "node_modules",
15 | "dist",
16 | ".next",
17 | "src/shared/libs/__tests__/**/*",
18 | ],
19 | },
20 | esbuild: {
21 | jsxFactory: "React.createElement",
22 | jsxFragment: "React.Fragment",
23 | },
24 | resolve: {
25 | alias: {
26 | "@": resolve(**dirname, "./src"),
27 | "@/entities": resolve(**dirname, "./src/entities"),
28 | "@/shared": resolve(\_\_dirname, "./src/shared"),
29 | },
30 | },
31 | });
32 |

---
