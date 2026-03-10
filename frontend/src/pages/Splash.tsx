import React from "react";

const Splash: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-500 text-white">
      <div className="flex flex-col items-center">
        <h1 className="mb-6 text-3xl font-bold text-center">mesaDigital</h1>
        <span className="loader"></span>
      </div>
    </div>
  );
};

export default Splash;
