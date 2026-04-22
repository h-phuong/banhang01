const Address = require("../models/Address");

exports.getMyAddresses = async (req, res) => {
  try {
    const { userId } = req.params;
    const list = await Address.find({ userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const { userId, name, receiver, phone, detail, isDefault } = req.body;
    if (!userId || !receiver || !phone || !detail) {
      return res
        .status(400)
        .json({ message: "Thiếu userId/receiver/phone/detail" });
    }

    if (isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    const doc = await Address.create({
      userId,
      name: name || "Địa chỉ",
      receiver,
      phone,
      detail,
      isDefault: !!isDefault,
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, receiver, phone, detail, isDefault } = req.body;

    const current = await Address.findById(id);
    if (!current) return res.status(404).json({ message: "Address not found" });

    if (isDefault === true) {
      await Address.updateMany(
        { userId: current.userId },
        { $set: { isDefault: false } },
      );
    }

    current.name = name ?? current.name;
    current.receiver = receiver ?? current.receiver;
    current.phone = phone ?? current.phone;
    current.detail = detail ?? current.detail;
    if (typeof isDefault === "boolean") current.isDefault = isDefault;

    const saved = await current.save();
    res.json(saved);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await Address.findById(id);
    if (!current) return res.status(404).json({ message: "Address not found" });

    await Address.updateMany(
      { userId: current.userId },
      { $set: { isDefault: false } },
    );
    current.isDefault = true;
    await current.save();

    res.json({ message: "Set default ok" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Address.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Address not found" });
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
