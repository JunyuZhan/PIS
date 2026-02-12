"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { Turnstile } from "@/components/auth/turnstile";

/**
 * 管理员登录页
 */
const ADMIN_USERNAME = "admin";

export default function LoginPage() {
  // 登录方式：'email' | 'username'
  const [loginType, setLoginType] = useState<"email" | "username">("username");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(ADMIN_USERNAME);
  // 动态获取的管理员邮箱（从 check-admin-status API 获取）
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const pageLoadTimeRef = useRef<number | null>(null);

  // 首次登录设置密码相关状态
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean | null>(
    null,
  ); // null 表示正在检查
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // 检查是否配置了 Turnstile（只在客户端检查，避免 Hydration 错误）
  useEffect(() => {
    setIsClient(true);
    // 记录页面加载时间（Turnstile 验证从此时开始）
    pageLoadTimeRef.current = Date.now();

    // 检测是否为移动端
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobile(mobileRegex.test(userAgent));

    // 页面加载时检查管理员账户状态
    checkAdminStatus();
  }, []);

  // 检查管理员账户状态
  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/auth/check-admin-status", {
        cache: "no-store", // 确保每次都获取最新状态
      });

      if (!response.ok) {
        // 如果 API 返回错误，默认显示登录表单（更安全，避免误操作）
        setNeedsPasswordSetup(false);
        return;
      }

      const data = await response.json();

      // 根据 API 返回的结果设置状态
      // 确保正确处理布尔值（防止字符串 "true"/"false"）
      const needsSetup =
        data.needsPasswordSetup === true || data.needsPasswordSetup === "true";
      setNeedsPasswordSetup(needsSetup);

      // ⚠️ 重要：保存实际的管理员邮箱（用于用户名登录）
      if (data.email) {
        setAdminEmail(data.email);
      }
    } catch {
      // 网络错误或其他错误，默认显示登录表单（更安全）
      setNeedsPasswordSetup(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const hasTurnstile = isClient && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // 注意：错误消息现在由服务端统一处理，不再需要客户端映射
  // 保留此函数用于向后兼容，但实际不再使用

  // 将用户名或邮箱转换为实际邮箱
  const getEmailForLogin = (): string => {
    if (loginType === "username") {
      // 用户名登录：动态映射到实际的管理员邮箱
      // ⚠️ 重要：使用从 check-admin-status API 获取的实际管理员邮箱
      // 如果还没有获取到，发送 "admin" 让服务端处理（服务端会动态查找）
      if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        // 如果已经获取到管理员邮箱，使用它；否则发送 "admin" 让服务端处理
        return adminEmail || "admin";
      }
      // 其他用户名暂不支持，返回空字符串（会触发验证错误）
      return "";
    } else {
      // 邮箱登录：使用用户输入的邮箱
      return email.trim();
    }
  };

  // 刷新 Turnstile 验证（仅移动端）
  const handleRefreshTurnstile = () => {
    if (!window.turnstile) {
      console.error("[Login] Turnstile not loaded");
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.error("[Login] Turnstile site key not configured");
      return;
    }

    try {
      // 重新渲染 Turnstile widget
      if (turnstileContainerRef.current) {
        // 清空容器
        turnstileContainerRef.current.innerHTML = "";

        // 重新渲染
        const widgetId = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            console.log("[Login] Turnstile verified (refreshed)");
            setTurnstileToken(token);
            setTurnstileError(false);
            setShowRefreshButton(false);
          },
          "error-callback": () => {
            console.error("[Login] Turnstile verification error (refreshed)");
            setTurnstileError(true);
            // 如果刷新后仍失败，允许登录（降级）
            setShowRefreshButton(false);
          },
          "expired-callback": () => {
            console.warn("[Login] Turnstile token expired (refreshed)");
            setTurnstileToken(null);
          },
          size: "invisible",
          theme: "auto",
        });

        // Invisible 模式需要手动触发验证
        setTimeout(() => {
          if (window.turnstile && widgetId) {
            try {
              console.log("[Login] Executing Turnstile verification (refreshed)");
              window.turnstile.execute(widgetId);
            } catch (error) {
              console.error("[Login] Failed to execute Turnstile:", error);
              setTurnstileError(true);
              setShowRefreshButton(false);
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error("[Login] Failed to refresh Turnstile:", error);
      // 如果刷新失败，允许登录（降级）
      setShowRefreshButton(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 防止重复提交：如果已经在加载中，直接返回
    if (loading) {
      console.log("[Login] Already processing, ignoring duplicate click");
      return;
    }

    // 立即设置加载状态，确保用户看到反馈
    setLoading(true);
    setError("");

    // 使用 requestAnimationFrame 确保 UI 更新
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // 前端验证
    if (loginType === "username") {
      if (!username.trim()) {
        setError("请输入用户名");
        setLoading(false);
        return;
      }
      if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
        setError("用户名错误，仅支持 admin");
        setLoading(false);
        return;
      }
    } else {
      if (!email.trim()) {
        setError("请输入邮箱地址");
        setLoading(false);
        return;
      }
      // 简单的邮箱格式验证
      if (!email.includes("@")) {
        setError("请输入有效的邮箱地址");
        setLoading(false);
        return;
      }
    }

    if (!password) {
      setError("请输入密码");
      setLoading(false);
      return;
    }

    // 如果配置了 Turnstile，等待验证完成
    // Invisible 模式会在页面加载时自动执行验证（通过 execute() 方法）
    // 优化：移动端需要更长的时间（网络较慢，脚本加载和验证需要更多时间）
    if (hasTurnstile && !turnstileToken && !turnstileError) {
      // 计算从页面加载到现在已经过去的时间
      const timeSincePageLoad = pageLoadTimeRef.current
        ? Date.now() - pageLoadTimeRef.current
        : 0;

      // 移动端使用更长的超时时间（10 秒），桌面端使用较短时间（3 秒）
      const timeoutMs = isMobile ? 10000 : 3000;

      // Turnstile 验证从页面加载时就开始，用户输入的时间已经算在内
      // 如果已经等待了超过超时时间，显示刷新按钮或直接继续
      if (timeSincePageLoad > timeoutMs) {
        console.log(
          `[Login] Turnstile timeout (>${timeoutMs}ms), showing refresh button`,
        );
        // 移动端显示刷新按钮，桌面端直接降级
        if (isMobile) {
          setShowRefreshButton(true);
          setLoading(false);
          return;
        } else {
          console.log("[Login] Proceeding with login (desktop fallback)");
          // 继续登录流程，让服务端处理（服务端有降级策略）
        }
      } else {
        // 移动端需要更长的等待时间（2秒），因为网络和脚本加载可能较慢
        // 桌面端等待时间较短（1秒）
        const maxWaitTime = isMobile ? 2000 : 1000;
        const remainingWait = Math.max(0, maxWaitTime - timeSincePageLoad);
        
        if (remainingWait > 0) {
          console.log(
            `[Login] Waiting for Turnstile (${remainingWait}ms remaining, mobile: ${isMobile})`,
          );
          // 使用较短的等待间隔，让 UI 能够及时更新
          const waitInterval = 100; // 100ms 间隔，平衡响应性和性能
          let waited = 0;
          while (!turnstileToken && !turnstileError && waited < remainingWait) {
            await new Promise((resolve) => setTimeout(resolve, waitInterval));
            waited += waitInterval;
          }
        }

        // 如果仍然没有 token，移动端显示刷新按钮，桌面端降级
        if (!turnstileToken && !turnstileError) {
          if (isMobile) {
            console.log(
              "[Login] Turnstile not ready on mobile, showing refresh button",
            );
            setShowRefreshButton(true);
            setLoading(false);
            return;
          } else {
            console.log(
              "[Login] Turnstile not ready, proceeding with login (desktop fallback)",
            );
          }
        } else {
          console.log("[Login] Turnstile ready, proceeding with login");
        }
      }
    }

    try {
      console.log("[Login] Starting login request");

      // 获取实际邮箱（用户名登录会动态映射到实际的管理员邮箱）
      const actualEmail = getEmailForLogin();
      console.log("[Login] Login details:", {
        loginType,
        actualEmail,
        passwordLength: password.length,
        hasTurnstileToken: !!turnstileToken,
      });

      // 调用服务端登录 API（包含速率限制和登录逻辑）
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: actualEmail,
          password,
          turnstileToken: turnstileToken || undefined, // 可选：如果配置了 Turnstile
        }),
        credentials: "include", // 确保 Cookie 被包含
      });

      console.log("[Login] Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      console.log("[Login] Response data:", data);

      if (!response.ok) {
        // 处理首次登录需要设置密码的情况（428 Precondition Required）
        if (
          response.status === 428 &&
          (data.requiresPasswordSetup ||
            data.error?.code === "PASSWORD_NOT_SET")
        ) {
          console.log("[Login] Password not set, switching to setup form");
          // 重新检查状态，确保 UI 正确显示密码设置表单
          await checkAdminStatus();
          setError("首次登录需要设置密码");
          setPassword(""); // 清空密码输入
          return;
        }

        // 处理速率限制错误
        if (response.status === 429) {
          const errorMsg = data.error?.message || "请求过于频繁，请稍后再试";
          console.error("[Login] Rate limit exceeded:", errorMsg);
          setError(errorMsg);
        } else if (response.status === 401) {
          // 统一错误消息，不暴露具体错误原因
          const errorMsg = data.error?.message || "邮箱或密码错误";
          console.error("[Login] ====== LOGIN FAILED (401) ======");
          console.error("[Login] Status:", response.status);
          console.error("[Login] Email used:", actualEmail);
          console.error("[Login] Error:", data.error);
          console.error("[Login] Full response:", data);
          console.error("[Login] Error message:", errorMsg);
          setError(errorMsg);
        } else if (response.status === 400) {
          // 显示详细的验证错误信息
          let errorMsg = "请求格式错误";
          if (
            data.error?.details &&
            Array.isArray(data.error.details) &&
            data.error.details.length > 0
          ) {
            const firstDetail = data.error.details[0];
            errorMsg =
              firstDetail.message || data.error?.message || "输入验证失败";
          } else if (data.error?.message) {
            errorMsg = data.error.message;
          }
          console.error("[Login] Validation error:", {
            status: response.status,
            error: data.error,
            errorMsg,
          });
          setError(errorMsg);
        } else {
          const errorMsg =
            data.error?.message || `登录失败，请重试 (${response.status})`;
          console.error("[Login] Unexpected error:", {
            status: response.status,
            error: data.error,
            errorMsg,
          });
          setError(errorMsg);
        }
        return;
      }

      // 登录成功，使用 window.location 强制刷新页面以确保 cookie 生效
      console.log("[Login] Login successful, redirecting to admin");
      console.log("[Login] ====== LOGIN SUCCESS ======");
      console.log("[Login] Email:", actualEmail);
      console.log("[Login] Response status:", response.status);
      console.log("[Login] Response data:", data);

      // 开发环境：添加调试暂停点，让用户有时间查看日志
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] ⚠️ DEBUG MODE: Will redirect in 15 seconds...");
        console.log("[Login] ⚠️ Check the logs above before redirect!");
        console.log("[Login] ⚠️ You have time to copy the logs!");
        // 可选：取消注释下面的行来暂停执行（需要开发者工具打开）
        // debugger
        await new Promise((resolve) => setTimeout(resolve, 15000));
      } else {
        // 生产环境：短暂延迟确保 Cookie 被设置
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 使用 window.location.href 而不是 router.push，确保浏览器重新加载页面
      // 这样可以让服务端设置的 cookie 立即生效，避免 layout 检查用户时读取不到会话
      console.log("[Login] Redirecting to /admin using window.location.href");
      window.location.href = "/admin";
    } catch (err) {
      console.error("[Login] Login error:", err);
      const errorMsg = err instanceof Error ? err.message : "登录失败，请重试";
      setError(errorMsg);
    } finally {
      setLoading(false);
      console.log("[Login] Login process completed");
    }
  };

  // 处理首次登录设置密码
  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setError("");

    // 前端验证
    if (!newPassword || newPassword.length < 8) {
      setError("密码至少需要 8 个字符");
      setSetupLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      setSetupLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: adminEmail || "admin@pis.com", // 使用动态获取的管理员邮箱，或回退到默认值
          password: newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.error?.message || "请求过于频繁，请稍后再试");
        } else if (
          response.status === 400 &&
          data.error?.code === "PASSWORD_ALREADY_SET"
        ) {
          // 密码已设置，静默切换到登录表单（不显示错误消息，因为这是正常状态）
          // 重新检查状态，确保 UI 正确显示登录表单
          await checkAdminStatus();
          // 不设置错误消息，让用户看到登录表单即可
        } else {
          setError(data.error?.message || "密码设置失败，请重试");
        }
        return;
      }

      // 密码设置成功，自动使用新密码登录
      const savedPassword = newPassword; // 保存密码用于登录
      // 优先使用从 check-admin-status 获取的实际管理员邮箱
      // 如果没有获取到，使用设置密码时使用的邮箱（从 API 响应中获取）
      // 最后回退到 'admin'，让服务端动态查找
      const loginEmail = adminEmail || data.email || "admin";

      console.log(
        "[SetupPassword] Password setup successful, attempting auto-login:",
        {
          email: loginEmail,
          adminEmail,
          dataEmail: data.email,
          passwordLength: savedPassword.length,
          hasTurnstileToken: !!turnstileToken,
        },
      );

      // 清空表单（但保持 loading 状态，直到登录完成）
      setNewPassword("");
      setConfirmPassword("");
      setError("");

      // 自动尝试登录
      try {
        console.log("[SetupPassword] Sending login request...");
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: loginEmail,
            password: savedPassword,
            turnstileToken: turnstileToken || undefined,
          }),
          credentials: "include", // 确保 Cookie 被包含
        });

        console.log("[SetupPassword] Login response received:", {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          ok: loginResponse.ok,
        });

        const loginData = await loginResponse.json();
        console.log("[SetupPassword] Login response data:", loginData);

        if (loginResponse.ok) {
          // 登录成功，先更新状态，然后重定向
          console.log(
            "[SetupPassword] Login successful after password setup, redirecting to admin",
          );
          console.log("[SetupPassword] ====== AUTO-LOGIN SUCCESS ======");
          console.log("[SetupPassword] Email:", loginEmail);
          console.log("[SetupPassword] Response status:", loginResponse.status);
          console.log("[SetupPassword] Response data:", loginData);

          // 开发环境：添加调试暂停点，让用户有时间查看日志
          if (process.env.NODE_ENV === "development") {
            console.log(
              "[SetupPassword] ⚠️ DEBUG MODE: Will redirect in 15 seconds...",
            );
            console.log(
              "[SetupPassword] ⚠️ Check the logs above before redirect!",
            );
            console.log("[SetupPassword] ⚠️ You have time to copy the logs!");
            // 可选：取消注释下面的行来暂停执行（需要开发者工具打开）
            // debugger
          }

          // 更新状态，防止显示登录表单
          setNeedsPasswordSetup(false);

          // 重要：等待 Cookie 被浏览器保存
          // 使用多层等待确保 Cookie 被完全处理：
          // 1. requestAnimationFrame 确保浏览器有机会处理 DOM 更新
          // 2. setTimeout 确保 Cookie 被浏览器保存
          // 开发环境：增加延迟时间，让用户有时间查看和复制日志
          const delay = process.env.NODE_ENV === "development" ? 15000 : 500;

          // 验证 Cookie 是否已设置（通过检查 document.cookie）
          // 注意：HttpOnly Cookie 无法通过 JavaScript 读取，但我们可以等待足够的时间
          console.log("[SetupPassword] Waiting for cookies to be set...");
          console.log(
            "[SetupPassword] Note: HttpOnly cookies cannot be verified via JavaScript, but we wait long enough",
          );

          await new Promise((resolve) => {
            // 第一层：等待下一个渲染帧
            requestAnimationFrame(() => {
              // 第二层：再等待一个渲染帧
              requestAnimationFrame(() => {
                // 第三层：等待浏览器处理 Cookie（通常需要 50-100ms）
                // 开发环境：增加延迟以便查看日志
                setTimeout(() => {
                  console.log(
                    "[SetupPassword] Delay completed, redirecting now...",
                  );
                  console.log(
                    "[SetupPassword] Cookie should be set by now (HttpOnly cookies are not visible to JS)",
                  );
                  resolve(undefined);
                }, delay);
              });
            });
          });

          // 使用 window.location.href 而不是 replace，确保完整的页面加载
          // 这会触发完整的页面重新加载，确保 Cookie 被正确读取
          // 注意：使用 href 而不是 replace，因为 replace 可能会更快地清除状态
          console.log(
            "[SetupPassword] Redirecting to /admin using window.location.href",
          );
          window.location.href = "/admin";

          // 不调用 finally 中的 setSetupLoading(false)，因为页面即将重定向
          return;
        } else {
          // 登录失败，显示错误但保持密码设置表单（因为密码已设置成功）
          const errorMessage =
            loginData.error?.message ||
            `密码已设置，但自动登录失败 (${loginResponse.status})，请使用新密码登录`;
          console.error("[SetupPassword] ====== AUTO-LOGIN FAILED ======");
          console.error("[SetupPassword] Status:", loginResponse.status);
          console.error("[SetupPassword] Email used:", loginEmail);
          console.error("[SetupPassword] Error:", loginData.error);
          console.error("[SetupPassword] Full response:", loginData);
          console.error("[SetupPassword] Error message:", errorMessage);
          setError(errorMessage);
          // 更新状态为不需要设置密码，显示登录表单
          setNeedsPasswordSetup(false);
          await checkAdminStatus(); // 重新检查状态，确保显示登录表单
        }
      } catch (loginErr) {
        console.error("[SetupPassword] ====== AUTO-LOGIN EXCEPTION ======");
        console.error("[SetupPassword] Error:", loginErr);
        console.error(
          "[SetupPassword] Error type:",
          loginErr instanceof Error
            ? loginErr.constructor.name
            : typeof loginErr,
        );
        console.error(
          "[SetupPassword] Error message:",
          loginErr instanceof Error ? loginErr.message : String(loginErr),
        );
        console.error(
          "[SetupPassword] Error stack:",
          loginErr instanceof Error ? loginErr.stack : "N/A",
        );
        const errorMessage =
          loginErr instanceof Error
            ? loginErr.message
            : "密码已设置，但自动登录失败，请使用新密码登录";
        setError(errorMessage);
        // 更新状态为不需要设置密码，显示登录表单
        setNeedsPasswordSetup(false);
        await checkAdminStatus(); // 重新检查状态，确保显示登录表单
      }
    } catch (err) {
      console.error("Setup password error:", err);
      setError("密码设置失败，请重试");
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-elevated rounded-2xl mb-4">
            <Camera className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-serif font-bold">PIS 管理后台</h1>
          <p className="text-text-secondary mt-2">
            {needsPasswordSetup === null
              ? "正在检查..."
              : needsPasswordSetup
                ? "首次登录，请设置密码"
                : "请登录以继续"}
          </p>
        </div>

        {/* 正在检查状态 */}
        {checkingStatus ? (
          <div className="card space-y-6 p-6 sm:p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-text-muted" />
            <p className="text-text-secondary">正在检查账户状态...</p>
          </div>
        ) : needsPasswordSetup ? (
          /* 首次登录设置密码表单 */
          <form
            onSubmit={handleSetupPassword}
            className="card space-y-6 p-6 sm:p-8"
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-full mb-3">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                首次登录，请设置密码
              </h2>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* 用户名（固定为 admin，只读） */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                value="admin"
                readOnly
                className="input bg-surface-elevated cursor-not-allowed"
                disabled
              />
              <p className="text-xs text-text-muted mt-1">管理员账户用户名</p>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                新密码
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="至少 8 个字符"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1.5 -m-1.5 rounded active:scale-[0.95] touch-manipulation"
                  aria-label={showNewPassword ? "隐藏密码" : "显示密码"}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1">
                密码至少需要 8 个字符
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                确认密码
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="再次输入密码"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1.5 -m-1.5 rounded active:scale-[0.95] touch-manipulation"
                  aria-label={showConfirmPassword ? "隐藏密码" : "显示密码"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={setupLoading}
              className="btn-primary w-full"
            >
              {setupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {needsPasswordSetup ? "设置中..." : "登录中..."}
                </>
              ) : (
                "设置密码并登录"
              )}
            </button>
          </form>
        ) : (
          /* 登录表单 */
          <form onSubmit={handleLogin} className="card space-y-6 p-6 sm:p-8">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* 登录方式选择 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                登录方式
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginType("username");
                    setUsername(ADMIN_USERNAME);
                    setEmail("");
                    setError("");
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    loginType === "username"
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-elevated text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  用户名登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginType("email");
                    setEmail("");
                    setUsername("");
                    setError("");
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    loginType === "email"
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-elevated text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  邮箱登录
                </button>
              </div>
            </div>

            {/* 用户名或邮箱输入 */}
            {loginType === "username" ? (
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  用户名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="admin"
                  required
                />
                <p className="text-xs text-text-muted mt-1">当前仅支持 admin</p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  邮箱地址
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your@email.com"
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1.5 -m-1.5 rounded active:scale-[0.95] touch-manipulation"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile (Invisible 模式) */}
            {hasTurnstile && (
              <>
                {/* Turnstile 组件 - 无需外层隐藏 div，组件内部已处理 */}
                <Turnstile
                  onVerify={(token) => {
                    setTurnstileToken(token);
                    setTurnstileError(false);
                  }}
                  onError={() => {
                    console.warn(
                      "Turnstile verification error, will proceed with fallback",
                    );
                    setTurnstileError(true);
                    // 不设置错误消息，允许降级登录
                    // 服务端会处理 Turnstile 验证失败的情况
                  }}
                  onExpire={() => {
                    setTurnstileToken(null);
                    // Token 过期不影响登录，用户重新提交时会重新验证
                  }}
                />

                {/* 移动端刷新验证按钮（仅在验证超时时显示） */}
                {showRefreshButton && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm mb-4">
                    <p className="mb-2">人机验证超时，请刷新后重试</p>
                    <button
                      type="button"
                      onClick={handleRefreshTurnstile}
                      className="w-full py-2 px-4 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm font-medium transition-colors active:scale-[0.98] touch-manipulation"
                    >
                      刷新验证
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
