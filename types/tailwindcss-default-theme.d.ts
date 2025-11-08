declare module "tailwindcss/defaultTheme" {
  const defaultTheme: {
    fontFamily: Record<string, string[]>;
    [key: string]: unknown;
  };

  export default defaultTheme;
}
