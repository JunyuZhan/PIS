/**
 * 用户权限管理 API
 * GET: 获取用户权限
 * PUT: 更新用户特殊权限
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ApiError, handleApiError, requireAuth } from "@/lib/api-utils";
import {
  getUserPermissions,
  clearPermissionCache,
  UserRole,
  ROLE_LABELS,
} from "@/lib/permissions";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UserInfo {
  id: string;
  email: string;
  role: string;
}

interface SpecialPermissionRow {
  granted: boolean;
  expires_at: string | null;
  permissions: {
    code: string;
    name: string;
  };
}

interface RolePermissionRow {
  permissions: {
    code: string;
  };
}

const updateUserPermissionsSchema = z.object({
  grants: z.array(
    z.object({
      code: z.string(),
      granted: z.boolean(),
      expiresAt: z.string().nullable().optional(),
    }),
  ),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth(request);

    if (user.role !== "admin") {
      throw new ApiError("无权访问权限管理", 403);
    }

    const { id: userId } = await params;
    const db = createServerSupabaseClient();

    // 获取用户信息
    const { data: targetUserData, error: userError } = await db
      .from("users")
      .select("id, email, role")
      .eq("id", userId)
      .single();
    const targetUser = targetUserData as UserInfo | null;

    if (userError || !targetUser) {
      throw new ApiError("用户不存在", 404);
    }

    // 获取用户的有效权限
    const effectivePermissions = await getUserPermissions(
      userId,
      targetUser.role as UserRole,
    );

    // 获取用户特殊权限（使用 JOIN 查询）
    const { data: specialPermissions } = await db.query<{
      granted: boolean;
      expires_at: string | null;
      code: string;
      name: string;
    }>(
      `
      SELECT 
        up.granted,
        up.expires_at,
        p.code,
        p.name
      FROM user_permissions up
      INNER JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
      ORDER BY p.code
    `,
      [userId],
    );

    // 获取角色默认权限（使用 JOIN 查询）
    const { data: rolePermissions } = await db.query<{
      code: string;
    }>(
      `
      SELECT 
        p.code
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role = $1
      ORDER BY p.code
    `,
      [targetUser.role],
    );

    const rolePermCodes = new Set((rolePermissions || []).map((rp) => rp.code));

    return NextResponse.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        roleName: ROLE_LABELS[targetUser.role as UserRole] || targetUser.role,
      },
      effectivePermissions: Array.from(effectivePermissions),
      rolePermissions: Array.from(rolePermCodes),
      specialPermissions: (specialPermissions || []).map((sp) => {
        return {
          code: sp.code,
          name: sp.name,
          granted: sp.granted,
          expiresAt: sp.expires_at,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth(request);

    if (user.role !== "admin") {
      throw new ApiError("无权修改用户权限", 403);
    }

    const { id: userId } = await params;
    const body = await request.json();
    const validation = updateUserPermissionsSchema.safeParse(body);

    if (!validation.success) {
      throw new ApiError("请求参数无效", 400);
    }

    const { grants } = validation.data;
    const db = createServerSupabaseClient();

    // 验证用户存在
    const { data: targetUserData2, error: userError } = await db
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .single();
    const targetUser = targetUserData2 as { id: string; role: string } | null;

    if (userError || !targetUser) {
      throw new ApiError("用户不存在", 404);
    }

    // 不能修改管理员权限
    if (targetUser.role === "admin") {
      throw new ApiError("不能修改管理员权限", 403);
    }

    // 获取所有权限
    const { data: allPermissionsData } = await db
      .from("permissions")
      .select("id, code");
    const allPermissions = (allPermissionsData || []) as {
      id: string;
      code: string;
    }[];

    const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

    // 更新用户特殊权限
    for (const grant of grants) {
      const permissionId = permissionMap.get(grant.code);
      if (!permissionId) continue;

      if (grant.granted === null) {
        // 删除特殊权限，恢复角色默认
        await db
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission_id", permissionId);
      } else {
        // 更新或插入特殊权限
        await db.upsert(
          "user_permissions",
          {
            user_id: userId,
            permission_id: permissionId,
            granted: grant.granted,
            granted_by: user.id,
            expires_at: grant.expiresAt || null,
            updated_at: new Date().toISOString(),
          },
          "user_id,permission_id",
        );
      }
    }

    // 清除用户权限缓存
    clearPermissionCache(userId);

    return NextResponse.json({
      success: true,
      message: "用户权限已更新",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
