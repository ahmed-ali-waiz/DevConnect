# Development TODO - Social Media App

**Last Updated:** March 14, 2026

---

## 🔥 CRITICAL - DO FIRST

### Week 1: Core Integration
- [ ] **Create API Service Layer** (`client/src/services/api.js`)
  - [ ] Axios instance with base URL
  - [ ] Request interceptor (add JWT token)
  - [ ] Response interceptor (error handling)
  - [ ] Token refresh logic

- [ ] **Auth Service** (`client/src/services/authService.js`)
  - [ ] login(email, password)
  - [ ] register(userData)
  - [ ] logout()
  - [ ] getCurrentUser()
  - [ ] checkUsername(username)

- [ ] **Connect LoginPage**
  - [ ] Form submit → authService.login()
  - [ ] Store JWT token in localStorage
  - [ ] Dispatch Redux auth action
  - [ ] Redirect to home on success
  - [ ] Show API errors in UI

- [ ] **Connect RegisterPage**
  - [ ] Step 3 submit → authService.register()
  - [ ] Auto-login after register
  - [ ] Redirect to home
  - [ ] Show API errors

- [ ] **Protected Routes**
  - [ ] Create ProtectedRoute component
  - [ ] Check auth token before rendering
  - [ ] Redirect to login if not authenticated
  - [ ] Wrap all authenticated routes

- [ ] **Connect HomePage Feed**
  - [ ] Create postService.getFeed()
  - [ ] Fetch on component mount
  - [ ] Display loading skeleton
  - [ ] Replace mock data with API data
  - [ ] Handle empty state

---

## 🎯 WEEK 2: Post Interactions

- [ ] **PostCard Actions**
  - [ ] postService.likePost(postId)
  - [ ] postService.bookmarkPost(postId)
  - [ ] postService.repostPost(postId)
  - [ ] Optimistic UI updates
  - [ ] Sync with API

- [ ] **Create CommentModal Component**
  - [ ] Use Modal base component
  - [ ] commentService.getComments(postId)
  - [ ] Display comments list
  - [ ] Add comment form
  - [ ] commentService.addComment(postId, text)
  - [ ] Like comment action

- [ ] **PostComposer Integration**
  - [ ] postService.createPost(postData)
  - [ ] Upload media to Cloudinary
  - [ ] Add to feed on success
  - [ ] Clear form after submit

- [ ] **ProfilePage Integration**
  - [ ] userService.getUserProfile(username)
  - [ ] userService.getUserPosts(userId)
  - [ ] userService.followUser(userId)
  - [ ] Update follower counts
  - [ ] Load tabs content

- [ ] **Edit Profile**
  - [ ] Create EditProfileModal
  - [ ] userService.updateProfile(data)
  - [ ] Upload profile pic
  - [ ] Upload cover image
  - [ ] Update Redux state

---

## 🎯 WEEK 3: Real-time & Chat

- [ ] **ChatPage Integration**
  - [ ] chatService.getConversations()
  - [ ] chatService.getMessages(conversationId)
  - [ ] chatService.sendMessage(conversationId, text)
  - [ ] Display actual conversations

- [ ] **Socket.io Integration**
  - [ ] Connect socket in SocketContext
  - [ ] Listen for new messages
  - [ ] Update chat in real-time
  - [ ] Show typing indicators
  - [ ] Update online status

- [ ] **NotificationsPage**
  - [ ] notificationService.getNotifications()
  - [ ] notificationService.markAllRead()
  - [ ] Socket listener for new notifications
  - [ ] Real-time notification popups

- [ ] **SearchPage**
  - [ ] searchService.search(query)
  - [ ] Debounce input (300ms)
  - [ ] Display results
  - [ ] searchService.getTrendingHashtags()

- [ ] **BookmarksPage**
  - [ ] postService.getBookmarks()
  - [ ] Display bookmarked posts

---

## 🎯 WEEK 4: Missing Components

- [ ] **Modal Component** (`client/src/components/ui/Modal.jsx`)
  - [ ] Base modal with overlay
  - [ ] Click outside to close
  - [ ] ESC key to close
  - [ ] Framer Motion animations
  - [ ] Size variants (sm, md, lg, xl, full)

- [ ] **Dropdown Component** (`client/src/components/ui/Dropdown.jsx`)
  - [ ] Reusable dropdown base
  - [ ] Trigger + Menu pattern
  - [ ] Click outside to close
  - [ ] Keyboard navigation
  - [ ] Position variants

- [ ] **Skeleton Component** (`client/src/components/ui/Skeleton.jsx`)
  - [ ] PostSkeleton
  - [ ] ProfileSkeleton
  - [ ] ChatSkeleton
  - [ ] ContentSkeleton (generic)

- [ ] **Tooltip Component** (`client/src/components/ui/Tooltip.jsx`)
  - [ ] Hover trigger
  - [ ] Position variants (top, bottom, left, right)
  - [ ] Delay prop

- [ ] **RightPanel Component** (`client/src/components/layout/RightPanel.jsx`)
  - [ ] Trending section
  - [ ] Who to follow
  - [ ] Footer links

- [ ] **MobileNav Component** (`client/src/components/layout/MobileNav.jsx`)
  - [ ] Bottom navigation bar
  - [ ] Active tab indicator
  - [ ] Badge for notifications

---

## 🛠️ Essential Features

### SettingsPage
- [ ] Connect account settings form
- [ ] userService.updateSettings(data)
- [ ] Password change functionality
- [ ] Account deactivation
- [ ] Theme toggle (save preference)

### AdminPage (if logged in as admin)
- [ ] adminService.getStats()
- [ ] adminService.getUsers()
- [ ] adminService.banUser(userId)
- [ ] adminService.deletePost(postId)
- [ ] Display actual data

### StoryBar & StoryViewer
- [ ] storyService.getStoryFeed()
- [ ] storyService.createStory(media)
- [ ] storyService.viewStory(storyId)
- [ ] storyService.deleteStory(storyId)
- [ ] Create StoryViewer modal

---

## 🎨 UX Improvements

### Loading States
- [ ] Show skeleton while fetching data
- [ ] Button loading spinners
- [ ] Page loading indicators
- [ ] Optimistic UI updates

### Error Handling
- [ ] Global error boundary
- [ ] API error toast notifications
- [ ] Network error handling
- [ ] 404 page
- [ ] 500 error page

### Form Validation
- [ ] Real-time validation feedback
- [ ] Show API errors in forms
- [ ] Disable submit on invalid
- [ ] Clear errors on input change

### Media Optimization
- [ ] Lazy load images (react-lazy-load-image-component)
- [ ] Image compression before upload
- [ ] Profile pic cropping (react-image-crop)
- [ ] Video player controls

### Infinite Scroll
- [ ] Implement in HomePage feed
- [ ] Implement in ProfilePage posts
- [ ] Implement in SearchPage results
- [ ] Implement in BookmarksPage

---

## 🔐 Authentication Enhancements

- [ ] **Password Reset Flow**
  - [ ] Backend: POST /api/v1/auth/forgot-password
  - [ ] Backend: POST /api/v1/auth/reset-password/:token
  - [ ] Frontend: ForgotPasswordPage
  - [ ] Frontend: ResetPasswordPage
  - [ ] Email service integration

- [ ] **Email Service**
  - [ ] Setup SendGrid/Nodemailer
  - [ ] Welcome email template
  - [ ] Password reset email template
  - [ ] Email verification

- [ ] **OAuth**
  - [ ] Backend: Google OAuth routes
  - [ ] Backend: GitHub OAuth routes
  - [ ] Frontend: OAuth redirect handling
  - [ ] Connect GitHub account in settings

---

## 🚀 Advanced Features (Future)

### Post Enhancements
- [ ] Edit post functionality
- [ ] Link preview (Open Graph)
- [ ] Multi-image carousel
- [ ] GIF support (Giphy)
- [ ] Poll creation
- [ ] Post drafts

### Comment Enhancements
- [ ] Edit comment
- [ ] Comment sorting
- [ ] Load more replies
- [ ] @mentions in comments

### DM Enhancements
- [ ] Message reactions
- [ ] File attachments
- [ ] Voice messages
- [ ] Delete/edit messages
- [ ] Message search
- [ ] Pin/mute conversations
- [ ] Unread badges

### Story Enhancements
- [ ] Story replies
- [ ] Story reactions
- [ ] Story highlights
- [ ] Story privacy settings

### User Features
- [ ] Block user
- [ ] Mute user
- [ ] Report user
- [ ] Profile verification
- [ ] Custom profile URL
- [ ] Multiple links

### Communities
- [ ] Create community
- [ ] Join community
- [ ] Community feed
- [ ] Community roles

### Search & Discovery
- [ ] Advanced filters
- [ ] Save searches
- [ ] Search history
- [ ] Autocomplete
- [ ] Personalized recommendations

### Analytics
- [ ] Post impressions
- [ ] Profile views
- [ ] Engagement rate
- [ ] Analytics dashboard
- [ ] Best time to post

### Privacy & Security
- [ ] Two-factor authentication
- [ ] Login history
- [ ] Active sessions
- [ ] Download your data

---

## 🧪 Testing

- [ ] Setup Jest + React Testing Library
- [ ] Backend API tests
- [ ] Frontend component tests
- [ ] Integration tests
- [ ] E2E tests (Cypress)

---

## 📚 Documentation

- [ ] API documentation (Swagger)
- [ ] Component documentation (Storybook)
- [ ] Setup instructions (README)
- [ ] Deployment guide
- [ ] Contributing guidelines

---

## 🚀 DevOps

- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Environment management
- [ ] Database migrations
- [ ] Logging system
- [ ] Error monitoring (Sentry)
- [ ] Backup strategy

---

## 📊 Progress Tracking

**Week 1:** Core Integration (Auth + Feed)
**Week 2:** Post Interactions (Like, Comment, Profile)
**Week 3:** Real-time Features (Chat, Notifications)
**Week 4:** UI Components + Polish

**Target MVP:** End of Week 4
**Target Beta Launch:** Week 8
**Target Full Launch:** Month 3

---

**Current Focus:** Create API service layer and connect authentication
