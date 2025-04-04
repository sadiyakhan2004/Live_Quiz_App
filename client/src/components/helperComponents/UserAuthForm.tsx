import React from 'react';

interface UserAuthFormProps {
  onSubmit: (data: { username: string; email: string }) => void;
  isVisible: boolean;
}

const UserAuthForm: React.FC<UserAuthFormProps> = ({ onSubmit, isVisible }) => {
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  
  const handleSubmit = (e : any) => {
    e.preventDefault();
    if (username.trim() && email.trim()) {
      onSubmit({ username, email });
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Join Room</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-white mb-2" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-white mb-2" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
              placeholder="Enter your email"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserAuthForm;