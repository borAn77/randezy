"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import UserMenu from "./UserMenu";
import CompleteProfileModal from "./CompleteProfileModal";
import { supabase } from "../../lib/supabase";

const isValidName = (name: string | null | undefined): boolean => {
  if (!name || name.trim().length < 2) return false;
  if (/^\d+$/.test(name.trim())) return false;
  return true;
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === "/";

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const checkProfileStatus = async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null);
      setShowCompleteProfile(false);
      setUserRole(null);
      setUserFullName(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('phone, full_name, role, email_verified')
      .eq('id', sessionUser.id)
      .single();

    if (!data?.email_verified) {
      setUser(null);
      setShowCompleteProfile(false);
      setUserRole(null);
      setUserFullName(null);
      return;
    }

    setUserRole(data.role);

    let displayName: string | null = isValidName(data.full_name) ? data.full_name : null;
    if (!displayName) {
      const metaName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name;
      if (isValidName(metaName)) {
        displayName = metaName;
        await supabase.from('profiles').update({ full_name: metaName }).eq('id', sessionUser.id);
      }
    }

    setUserFullName(displayName);
    setUser(sessionUser);

    if (!data.phone || !displayName) {
      setShowCompleteProfile(true);
    } else {
      setShowCompleteProfile(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleProfileUpdated = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) checkProfileStatus(session.user);
      });
    };
    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('profile-updated', handleProfileUpdated);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkProfileStatus(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setShowCompleteProfile(false);
        setUserRole(null);
        setUserFullName(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        checkProfileStatus(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleBusinessClick = () => {
    if (userRole === 'business_owner') {
      router.push("/dashboard");
    } else {
      router.push("/pro");
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full transition-all duration-500 z-[100] px-4 sm:px-8 lg:px-20
          ${isScrolled
            ? 'py-3 md:py-4 bg-white/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-b border-gray-100'
            : 'py-5 md:py-8 bg-transparent'
          }`}
      >
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <Link href="/" className="group flex flex-col">
            <span className={`text-xl md:text-2xl font-black tracking-tighter uppercase transition-colors duration-500
              ${(!isScrolled && isHomePage) ? 'text-white' : 'text-black'}`}>
              randezy
            </span>
            <div className="h-[3px] w-6 md:w-8 bg-[#00A3AD] mt-0.5 rounded-full group-hover:w-full transition-all duration-500"></div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6 lg:gap-12">
            {user ? (
              <UserMenu user={user} isDark={!isScrolled && isHomePage} fullName={userFullName} userRole={userRole} />
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className={`text-[10px] sm:text-[12px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all hover:text-[#00A3AD]
                  ${(!isScrolled && isHomePage) ? 'text-white' : 'text-gray-900'}`}
              >
                Giriş / Kayıt
              </button>
            )}

            <button
              onClick={handleBusinessClick}
              className={`px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-3.5 rounded-xl md:rounded-2xl text-[10px] sm:text-[11px] md:text-[12px] font-black transition-all shadow-xl uppercase tracking-wider md:tracking-widest
                ${(!isScrolled && isHomePage)
                  ? 'bg-white text-black hover:bg-[#00A3AD] hover:text-white'
                  : 'bg-black text-white hover:bg-[#00A3AD] shadow-[#00A3AD]/20'
                }`}
            >
              <span className="hidden sm:inline">
                {userRole === 'business_owner' ? 'Yönetim Paneli' : 'İşletmeni Ekle'}
              </span>
              <span className="sm:hidden">
                {userRole === 'business_owner' ? 'Panel' : 'İşletme Ekle'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {!isHomePage && <div className="h-[70px] md:h-[100px]"></div>}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {showCompleteProfile && user && (
        <CompleteProfileModal
          user={user}
          onComplete={() => {
            setShowCompleteProfile(false);
            checkProfileStatus(user);
          }}
        />
      )}
    </>
  );
}
