import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const dotVariants = {
  animate: (index: number) => ({
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 1,
      repeat: Infinity,
      delay: index * 0.2,
      ease: "easeInOut",
    },
  }),
};

export const AppBootLoader = ({ backendWakeup }: { backendWakeup: boolean }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar p-4">
        <Skeleton className="h-10 w-40" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <main className="flex-1 bg-background px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-8 rounded-lg border bg-card p-6"
          >
            <h1 className="text-2xl font-semibold text-foreground">
              {backendWakeup ? "Waking up backend server" : "Loading dashboard"}
            </h1>
            <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <span>Please wait</span>
              {Array.from({ length: 3 }).map((_, index) => (
                <motion.span key={index} custom={index} variants={dotVariants} animate="animate">
                  .
                </motion.span>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 w-full" />
        </div>
      </main>
    </div>
  );
};
