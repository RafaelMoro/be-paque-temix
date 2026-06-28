# QA

## Why does `GetAdminGuidesQueryDto` include `userId`?

`userId` is for `GET /guides/db/admin` only. It lets an admin request `scope=all` while narrowing results to one user.

It is not handled by `buildBaseQuery()` because that helper only builds shared guide filters: status, provider, tracking number, date range/month, and non-deleted records.

The admin-specific filter is applied later in `GuidesDbService.getAllGuides()`:

```ts
} else if (filters.scope === 'all' && filters.userId) {
  query.userId = new Types.ObjectId(filters.userId);
}
```

When `scope=own`, `userId` from the query is ignored and the authenticated admin user's id is used instead.
