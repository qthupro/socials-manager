import { Moon, Sun } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useTheme } from "@/shared/theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Chế độ sáng" : "Chế độ tối";

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
