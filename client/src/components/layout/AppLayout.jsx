import { useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import MobileNav from './MobileNav';
import Modal from '../ui/Modal';
import PostComposer from '../post/PostComposer';

const AppLayout = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showCompose, setShowCompose] = useState(false);
  
  const hideLayoutPattern = ['/login', '/register', '/forgot-password'];
  const shouldHideLayout = hideLayoutPattern.includes(location.pathname);

  const isChatPage = location.pathname === '/chat';
  const isActiveChat = isChatPage && !!searchParams.get('conversationId');

  if (shouldHideLayout) {
    return <Outlet />;
  }

  return (
    <div className="flex justify-center min-h-dvh bg-(--bg-primary)">
      <div className="flex w-full max-w-[1400px] items-start">
        {/* Left Sidebar — icon-only on md, full on xl */}
        <Sidebar onCompose={() => setShowCompose(true)} />

        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col min-w-0 border-r border-(--border-glass) relative overflow-x-hidden ${isActiveChat ? 'pb-0' : 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0'}`}>
          <Outlet />
        </main>

        {/* Right Panel — only on lg+ */}
        <RightPanel />

        {/* Mobile Navigation */}
        <MobileNav onCompose={() => setShowCompose(true)} />
      </div>

      {/* Global Compose Modal */}
      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="Create Post" maxWidth="max-w-xl">
        <PostComposer onPostCreated={() => setShowCompose(false)} />
      </Modal>
    </div>
  );
};

export default AppLayout;
