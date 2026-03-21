import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3eee2_0%,#f8f5ef_44%,#f2f7f1_100%)] px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="py-8">
          <div className="inline-flex rounded-full border border-[#d7dfd9] bg-white/60 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#6e7d76]">
            Shopa Console
          </div>
          <h1 className="mt-6 max-w-2xl text-5xl leading-tight text-[#163028]">
            中文后台登录入口，前台英文商城与分销支付链路分开管理。
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#66766f]">
            管理员可配置域名池、模板、Stripe 账号、回跳白名单和日志；分销商只能查看自己来源的订单。
          </p>
        </section>
        <section className="max-w-xl">
          <LoginForm nextPath={nextPath} />
        </section>
      </div>
    </main>
  );
}
