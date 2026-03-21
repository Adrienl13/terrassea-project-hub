import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MoodBoardAnalyzer from "@/components/mood-board/MoodBoardAnalyzer";

const MoodBoard = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="max-w-2xl">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                    {t("moodBoard.badge", "Visual analysis")}
                  </p>
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground leading-[1.1]">
                  {t("moodBoard.pageTitle", "Mood Board Analyzer")}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground font-body mt-4 max-w-lg leading-relaxed">
                {t(
                  "moodBoard.pageSubtitle",
                  "Upload a photo of your terrace and let us analyze the style, colors and ambiance to recommend the perfect furniture.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Analyzer */}
        <section className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <MoodBoardAnalyzer />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MoodBoard;
