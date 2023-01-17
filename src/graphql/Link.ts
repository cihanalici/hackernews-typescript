import { Prisma } from "@prisma/client";
import {
  extendType,
  nonNull,
  objectType,
  stringArg,
  intArg,
  inputObjectType,
  enumType,
  arg,
  list,
} from "nexus";

export const Link = objectType({
  name: "Link",
  definition(t) {
    t.nonNull.int("id");
    t.nonNull.string("description");
    t.nonNull.string("url");
    t.nonNull.dateTime("createdAt");
    t.field("postedBy", {
      // 1
      type: "User",
      resolve(parent, args, context) {
        // 2
        return context.prisma.link
          .findUnique({ where: { id: parent.id } })
          .postedBy();
      },
    });
    t.nonNull.list.nonNull.field("voters", {
      type: "User",
      resolve(parent, args, context) {
        return context.prisma.link
          .findUnique({ where: { id: parent.id } })
          .voters();
      },
    });
  },
});

export const LinkOrderByInput = inputObjectType({
  name: "LinkOrderByInput",
  definition(t) {
    t.field("description", { type: Sort });
    t.field("url", { type: Sort });
    t.field("createdAt", { type: Sort });
  },
});

export const Sort = enumType({
  name: "Sort",
  members: ["asc", "desc"],
});

export const Feed = objectType({
  name: "Feed",
  definition(t) {
    t.nonNull.list.nonNull.field("links", { type: "Link" });
    t.nonNull.int("count");
    t.id("id");
  },
});

export const LinkQuery = extendType({
  type: "Query",
  definition(t) {
    t.nonNull.field("feed", {
      // 1
      type: "Feed",
      args: {
        filter: stringArg(),
        skip: intArg(),
        take: intArg(),
        orderBy: arg({ type: list(nonNull(LinkOrderByInput)) }),
      },
      async resolve(parent, args, context) {
        const where = args.filter
          ? {
              OR: [
                { description: { contains: args.filter } },
                { url: { contains: args.filter } },
              ],
            }
          : {};

        const links = await context.prisma.link.findMany({
          where,
          skip: args?.skip as number | undefined,
          take: args?.take as number | undefined,
          orderBy: args?.orderBy as
            | Prisma.Enumerable<Prisma.LinkOrderByWithRelationInput>
            | undefined,
        });

        const count = await context.prisma.link.count({ where }); // 2
        const id = `main-feed:${JSON.stringify(args)}`; // 3

        return {
          // 4
          links,
          count,
          id,
        };
      },
    });

    // t.nonNull.list.nonNull.field("link", {
    //   type: "Link",
    //   args: {
    //     id: nonNull(stringArg()),
    //   },
    //   resolve(parent, args, context, info) {
    //     const { id } = args;
    //     return links.filter((link) => link.id === Number(id));
    //   },
    // });
  },
});

export const LinkMutation = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("post", {
      type: "Link",
      args: {
        description: nonNull(stringArg()),
        url: nonNull(stringArg()),
      },
      resolve(parent, args, context) {
        const { userId } = context;

        if (!userId) {
          throw new Error("Cannot post without logging in.");
        }

        const newLink = context.prisma.link.create({
          data: {
            description: args.description,
            url: args.url,
            postedBy: { connect: { id: userId } },
          },
        });
        return newLink;
      },
    });

    //update link
    // t.nonNull.field("updateLink", {
    //   type: "Link",
    //   args: {
    //     id: nonNull(stringArg()),
    //     description: nonNull(stringArg()),
    //     url: nonNull(stringArg()),
    //   },
    //   resolve(parent, args, context) {
    //     const { id, description, url } = args;
    //     const link = links.find((link) => link.id === Number(id));
    //     if (link) {
    //       link.description = description;
    //       link.url = url;
    //     }
    //     return link;
    //   },
    // });

    //delete link
    // t.nonNull.field("deleteLink", {
    //   type: "Link",
    //   args: {
    //     id: nonNull(stringArg()),
    //   },
    //   resolve(parent, args, context) {
    //     const { id } = args;
    //     const link = links.find((link) => link.id === Number(id));
    //     if (link) {
    //       links = links.filter((link) => link.id !== Number(id));
    //     }
    //     return link;
    //   },
    // });
  },
});
