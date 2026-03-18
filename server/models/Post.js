import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      maxLength: [1000, "Post cannot exceed 1000 characters"],
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String,
      },
    ],
    video: {
      type: String,
      default: "",
    },
    codeSnippet: {
      language: { type: String, default: "" },
      code: { type: String, default: "" },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    reposts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    hashtags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    linkPreview: {
      url: { type: String, default: "" },
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      image: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Auto-extract hashtags from text before saving
postSchema.pre("save", function () {
  if (this.isModified("text") && this.text) {
    const tags = this.text.match(/#(\w+)/g);
    if (tags) {
      this.hashtags = tags.map((t) => t.substring(1).toLowerCase());
    }
  }
});

// Virtual counts
postSchema.virtual("likeCount").get(function () {
  return this.likes?.length || 0;
});
postSchema.virtual("commentCount").get(function () {
  return this.comments?.length || 0;
});
postSchema.virtual("repostCount").get(function () {
  return this.reposts?.length || 0;
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ text: "text" });

const Post = mongoose.model("Post", postSchema);
export default Post;
