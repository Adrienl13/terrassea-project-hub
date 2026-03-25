import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Collections() {
  return (
    <>
      <Header />
      <section className="bg-[#FAF7F4] pt-24 pb-16 min-h-[50vh]">
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="font-display text-4xl font-bold text-foreground mb-3">
            Collections
          </h1>
          <p className="text-base font-body text-muted-foreground">
            Page en cours de chargement...
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
