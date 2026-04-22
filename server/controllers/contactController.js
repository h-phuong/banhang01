const Contact = require("../models/Contact");

exports.createContact = async (req, res) => {
  const contact = new Contact(req.body);
  await contact.save();
  res.json(contact);
};

exports.getContacts = async (req, res) => {
  const { status } = req.query;
  let filter = {};

  if (status === "pending") {
    filter = {
      $or: [
        { reply: { $exists: false } },
        { reply: null },
        { reply: "" },
        { reply: { $regex: /^\s*$/ } },
      ],
    };
  } else if (status === "replied") {
    filter = {
      reply: { $nin: [null, ""] },
    };
  }

  const contacts = await Contact.find(filter).sort({ createdAt: -1 });
  res.json(contacts);
};

exports.replyContact = async (req, res) => {
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    {
      reply: req.body.reply,
      status: "replied",
    },
    { new: true },
  );

  res.json(contact);
};

exports.getUnreadContacts = async (req, res) => {
  const contacts = await Contact.find({ status: "unread" });
  res.json(contacts);
};
