'use client';

interface IPhoneFrameProps {
  children?: React.ReactNode;
  mode?: 'device' | 'canvas';
}

export default function IPhoneFrame({ children, mode = 'device' }: IPhoneFrameProps) {
  if (mode === 'canvas') {
    return (
      <div
        className="relative overflow-hidden rounded-[38px] border border-white/[0.08] bg-black"
        style={{
          width: 340,
          height: 700,
          boxShadow: '0 36px 84px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="relative select-none" style={{ width: 340, height: 700 }}>
      {/* Outer shell */}
      <div
        className="absolute inset-0 rounded-[52px] bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0b] border border-white/[0.07]"
        style={{
          boxShadow: '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)',
        }}
      >
        {/* Side buttons */}
        <div className="absolute left-[-3px] top-[120px] w-[3px] h-9 bg-[#2a2a2c] rounded-l-sm" />
        <div className="absolute left-[-3px] top-[168px] w-[3px] h-9 bg-[#2a2a2c] rounded-l-sm" />
        <div className="absolute left-[-3px] top-[84px]  w-[3px] h-7 bg-[#2a2a2c] rounded-l-sm" />
        <div className="absolute right-[-3px] top-[144px] w-[3px] h-14 bg-[#2a2a2c] rounded-r-sm" />

        {/* Screen bezel */}
        <div className="absolute inset-[3px] rounded-[50px] bg-black overflow-hidden">

          {/* ── Full-screen content (iframe fills the entire screen) ── */}
          <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 50 }}>
            {children ?? (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center bg-[#f9f9f9]">
                <div className="w-12 h-12 rounded-2xl bg-[#ebebeb] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#8b8d97]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#8b8d97] text-xs font-medium">Preview will appear here</p>
                  <p className="text-[#c7c7cc] text-[10px] mt-1">Describe your app to get started</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Dynamic Island — always on top in device mode ── */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-30 bg-black rounded-full"
            style={{
              top: 12,
              width: 126,
              height: 36,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 1px #000',
            }}
          >
            {/* Front camera */}
            <div
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{ background: '#0a0a14', boxShadow: 'inset 0 0 4px rgba(0,0,0,0.9)' }}
            >
              <div className="absolute inset-1 rounded-full bg-[#1a1a30] opacity-50" />
            </div>
            {/* Mic dot */}
            <div className="absolute left-[38%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#111]" />
          </div>

          {/* ── Home indicator ── */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full z-30"
            style={{ width: 120, height: 5, background: 'rgba(255,255,255,0.35)' }}
          />
        </div>
      </div>
    </div>
  );
}
