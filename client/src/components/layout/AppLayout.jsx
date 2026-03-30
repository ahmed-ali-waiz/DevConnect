import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import MobileNav from './MobileNav';
import Modal from '../ui/Modal';
import PostComposer from '../post/PostComposer';

const AppLayout = () => {
  const location = useLocation();
  const [showCompose, setShowCompose] = useState(false);
  const hideLayoutPattern = ['/login', '/register', '/forgot-password'];
  const shouldHideLayout = hideLayoutPattern.includes(location.pathname);

  if (shouldHideLayout) {
    return <Outlet />;
  }

  return (
    <div className="flex justify-center min-h-screen bg-(--bg-primary)">
      {/* items-start: keep sidebar / main / right panel top-aligned when main is very tall (avoids huge empty space above the sidebar) */}
      <div className="flex w-full max-w-[1400px] items-start">
        {/* Left Sidebar */}
        <Sidebar onCompose={() => setShowCompose(true)} />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 border-r border-(--border-glass) relative pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Right Panel */}
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
