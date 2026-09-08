import {
  DEVELOPMENT_USER,
  isDevelopmentAuthEnabled,
} from "../../lib/auth/config";
import { signInAsDevelopmentUser } from "../actions/auth";

export default function LoginPage() {
  const devAuthEnabled = isDevelopmentAuthEnabled();

  return (
    <section className="auth-context" aria-labelledby="login-title">
      <div className="auth-context__copy">
        <p className="eyebrow">IDENTITY / ENTRY</p>
        <h1 id="login-title">
          进入
          <br />
          镜界。
        </h1>
        <p className="body-copy">
          这是世界之外的身份入口。当前仅提供明确标注的开发身份，真实身份认证尚未接入。
        </p>
      </div>

      <div className="auth-card" aria-live="polite">
        {devAuthEnabled ? (
          <>
            <div>
              <p className="auth-card__label">开发环境 seed 用户</p>
              <strong className="auth-card__identity">
                {DEVELOPMENT_USER.email}
              </strong>
              <p className="auth-card__note">
                仅用于本地验证。它不代表真人身份，也不会创建数字人或代理。
              </p>
            </div>
            <form action={signInAsDevelopmentUser}>
              <button className="auth-action" type="submit">
                以开发身份进入 <span aria-hidden="true">→</span>
              </button>
            </form>
          </>
        ) : (
          <>
            <div>
              <p className="auth-card__label">身份认证不可用</p>
              <strong className="auth-card__identity">尚未建立身份</strong>
              <p className="auth-card__note">
                当前环境已关闭开发免登录入口。生产环境不会误启用开发身份。
              </p>
            </div>
            <p className="status-line">
              <span className="status-dot" aria-hidden="true" />
              等待真实身份认证能力
            </p>
          </>
        )}
      </div>
    </section>
  );
}
