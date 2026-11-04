import './globals.css';

export const metadata = {
  title: 'CodeSentry - DBMS Project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 p-6 max-w-5xl mx-auto">
        {children}
      </body>
    </html>
  );
}
