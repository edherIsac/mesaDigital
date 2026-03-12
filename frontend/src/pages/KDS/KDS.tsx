import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function KDS() {
  return (
    <div>
      <PageMeta
        title="KDS | mesaDigital"
        description="Kitchen Display System — vista de cocina"
      />
      <PageBreadcrumb pageTitle="KDS" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.06] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Kitchen Display System
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aquí se mostrarán las órdenes en tiempo real para la cocina.
          </p>
        </div>
      </div>
    </div>
  );
}
