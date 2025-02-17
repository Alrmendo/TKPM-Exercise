import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: 'diw0acowj',
    secure: true,
    api_key: "886573185242367",
    api_secret: "Msf0xkATAMQBwGsjWNhkBIVnR38",
});

async function connectDatabase() {
    try {
        await mongoose.connect('mongodb+srv://nmtriet22:sgv18G4EEi6Tcp6N@qlsv.4gbbs.mongodb.net/');
        console.log('Connect database success');
    } catch (error) {  
        console.log('Connect database fail: ', error);
    }
}

export default { connectDatabase, cloudinary };

