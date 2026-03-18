import Report from "../models/Report.js";

// @desc    Create a report
// @route   POST /api/v1/reports
export const createReport = async (req, res, next) => {
  try {
    const { reportedUser, reportedPost, reportedComment, reason, description } = req.body;

    if (!reason) return res.status(400).json({ message: "Reason is required" });
    if (!reportedUser && !reportedPost && !reportedComment) {
      return res.status(400).json({ message: "Must specify what you are reporting" });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUser || null,
      reportedPost: reportedPost || null,
      reportedComment: reportedComment || null,
      reason,
      description: description || "",
    });

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports (admin)
// @route   GET /api/v1/admin/reports
export const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || "pending";

    const filter = status === "all" ? {} : { status };
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reporter", "name username profilePic")
      .populate("reportedUser", "name username profilePic")
      .populate("reportedPost", "text image")
      .populate("reportedComment", "text");

    const total = await Report.countDocuments(filter);

    res.json({ reports, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total });
  } catch (error) {
    next(error);
  }
};

// @desc    Update report status (admin)
// @route   PUT /api/v1/admin/reports/:id
export const updateReportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["reviewed", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate("reporter", "name username profilePic")
      .populate("reportedUser", "name username profilePic")
      .populate("reportedPost", "text image");

    if (!report) return res.status(404).json({ message: "Report not found" });

    res.json(report);
  } catch (error) {
    next(error);
  }
};
