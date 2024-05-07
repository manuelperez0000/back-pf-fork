const User = require('../models/users.model');
const { cleanUserInput } = require('../helpers/utils');
const checkJwt = require('../helpers/checkJwt');
const responseSuccess = require('../helpers/response-success');
const responseErrors = require('../helpers/response-errors');
const setJWT = require('../helpers/set-jwt');
const { createCrypto, decryptoPass, compareCrypto } = require('../helpers/crypto');
const  transporter  = require('../helpers/nodeMailer');
const  config = require('../config.js')

class UserController {

    
    /**
     *  Crea un nuevo usuario y retorna un token de acceso
     * @returns 
     */
    async createUser(req, res) {
        try {

            // extraigo la informacion del body
            const { username, email, phone, indentification, newpassword } = req.body;

            // genero el password encriptado
            const pass = createCrypto(newpassword);
            
            // creo el objeto con la informacion del usuario a crear
            const newUser = {
                username,
                email,
                phone,
                active : true,
                role: 'user',
                indentification,
                password: pass
            }
            
            // creo el usuario en la base de datos
            //const user = await User.create(newUser);
            const user = await User(newUser).save();
            // genero el token para el usuario creado */
            const token = setJWT({email, pass});

            // remuevo el password de la respuesta
            const data = cleanUserInput(user._doc);

            // retorno la respuesta formateada correctamente enviando el token y la informacion del usuario
            return responseSuccess(res, 200, {msg: 'Usuario creado exitosamente', data, token});
        } catch (error) {

            // retorno la respuesta de error
            return responseErrors(res, 400, 'bad Request', error);  
        }
    }


     /**
     *  Recibe un email y password, retorna un token de acceso y la informacion del usuario
     * @returns 
     */
    async loginUser(req, res) {
        try {

            responseSuccess(res, 200, {msg: 'acceso exitoso', data:{}, token:""})
           /*  const { email, newpassword } = req.body
            const user = await User.findOne({ email, active: true });
            
            // verifico que el usuario exista y este activo
            if (!user) {
                return responseErrors(res, 404, 'El usuario no existe');
            }

            const isPasswordValid = compareCrypto(newpassword, user.password);
            
            // verifico que el password sea valido
            if (!isPasswordValid) {
                return responseErrors(res, 401, 'Contraseña incorrecta');
            }

            // genero el token para el usuario logueado
            const {password} = user._doc;

            const token = setJWT({email,pass:password});
            
            // remuevo el password de la respuesta
            const data = cleanUserInput(user._doc);

            return responseSuccess(res, 200, {msg: 'acceso exitoso', data, token}); */
        } catch (error) {
             // retorno la respuesta de error
            /*  return responseErrors(res, 400, 'bad Request', error);   */
            responseErrors(res, 400, 'bad Request', error)
        }   
    }


    /**
     *  Recibe un id de usuario y actualiza la información del usuario y actualice el token
     * @returns 
     */

    async updateUser(req, res) {
        const {id,...getUser}  = req.body;
        const {email,pass} = checkJwt(req.headers.authorization.split(' ')[1]);
        
        if (getUser.email) {
            return responseErrors(res, 400, 'El email no se puede actualizarse', null);
        }
        if(getUser.password){
            const {password} = getUser;
            getUser.password = createCrypto(password);

        }
        //console.log(getUser);

       const userUpdated = await User.findOneAndUpdate({ _id: id }, getUser, { new: true });
       
       if (!userUpdated) {
            return responseErrors(res, 404, 'Usuario no encontrado', null);
       }
       // remuevo el password de la respuesta
       const data = cleanUserInput(userUpdated._doc);
       
       if(getUser.password){
            const {password,email} = userUpdated._doc;
           // console.log(password,email);
            const token = setJWT({email,pass:password});
            return responseSuccess(res, 200, {msg: 'Contraseña actualizada', data, token });
        }       
        
        return responseSuccess(res, 200, {msg: 'Usuario actualizado', data, token:setJWT({email,pass}) });
    }

    /**
     *  Recibe un id de usuario y elimina el usuario
     * @returns 
     */
    async deleteUser(req, res) {
        const {id,active} = req.body;

        const userDeleted = await User.findOneAndUpdate({ _id: id }, { active }, { new: true });

        if (!userDeleted) {
            return responseErrors(res, 404, 'Usuario no encontrado', null);
        }
        
        if(userDeleted.active){
            return responseSuccess(res, 200, {msg: 'Usuario Activado', user: cleanUserInput(userDeleted._doc) });
        }else{
            return responseSuccess(res, 200, {msg: 'Usuario eliminado', user: cleanUserInput(userDeleted._doc) });
        }
    }

    /**
     *  Recibe un token, retorna la información del usuario y actualiza el token
     * @returns 
     */
    async getUserByToken(req, res){
        const {authorization} = req.headers;
        const token = authorization.split(' ')[1];
        const { email,pass } = checkJwt(token);

        const user = await User.findOne({ email, active: true });

        if (!user) {
            return responseErrors(res, 404, 'usuario no encontrado',null);
        }

       // const newToken = setJWT({email,pass});
        const data = cleanUserInput(user._doc);

        return responseSuccess(res, 200, {msg: 'acceso exitoso', data});
    }
    
    /**
     *  Retorna la lista de todos los usuarios
     * @returns 
     */
    async getUsers(req, res) {
        const {role} = req.params
        // obtengo todos los usuarios activos de la base de datos
      if(role=='admin'){
        const users = await User.find();
        const data = users.map(user => cleanUserInput(user._doc));
        return responseSuccess(res, 200, {msg: 'Lista de usuarios', data:{ users:data, total: users.length  } });
      }
      const users = await User.find({ active: true });
      const data = users.map(user => cleanUserInput(user._doc));
      return responseSuccess(res, 200, {msg: 'Lista de usuarios', data:{ users:data, total: users.length  } }); 
    }


   /**
     *  Recibe un email, una lista de usuarios y el total de usuarios
     * @returns 
     */
    async getUserByEmail(req, res) {
        const {email} = req.body

        // obtengo todos los usuarios activos de la base de datos que coincidan con parcialmente con el email ingresado
        const users = await User.find({ email: { $regex: email, $options: 'i' }, active: true });

        if (!users || users.length === 0) {
            return responseErrors(res, 404, 'Usuario no encontrado', null);
        }
        const data = users.map(user => cleanUserInput(user._doc));
        return responseSuccess(res, 200, {msg: 'Usuario encontrados', data:{ users:data, total: users.length  }});
    }

    
    /**
     *  Recibe un nombre, una lista de usuarios y el total de usuarios
     * @returns 
     */
    async getUsersByName(req, res){
        const {name} = req.body
        const users = await User.find({ username: { $regex: name, $options: 'i' }, active: true });

        if (!users) {
            return responseErrors(res, 404, 'Usuario no encontrado', null);
        }
        return responseSuccess(res, 200, {msg: 'usuario encontrados', data:{ users:users, total: users.length  }});
    }


    /**
     *  Recibe un email y envia un correo electronico con el password
     */
    async forgotPassword(req, res) {
        const reqEmail = req.body.email;
        console.log(reqEmail);
        const user = await User.findOne({ email:reqEmail, active: true });
        if (!user) {
            return responseErrors(res, 404, 'Usuario no encontrado', null);
        }
        const { username,password,email } = user._doc;

       /* 
        Los Permisos de gmail cambian constantemente, recomiendo NO utilizar este mecanismo de autenticación.
        El metodo mas cercano  es realizar hasta el paso 6 de este tutorial:https://www.freecodecamp.org/espanol/news/como-usar-nodemailer-para-enviar-correos-electronicos-desde-tu-servidor-node-js/
        Luego tomar el access token que se obtuvo en el paso 6 de este mismo tutorial. 
         */

        
        const mailOptions = {
            from: `pfservicios <${config.auth.email}>`,
            to: `${email}`,
            subject: 'Correo de recuperación de contraseña',
            text: `Hola ${username}, su contraseña es: "${decryptoPass(password)}", por favor no la comparta con nadie.`,
           
        }
        await transporter.sendMail(mailOptions, function(error, info){
            if (error) {
               console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        }); 
        
        
      return responseSuccess(res, 200, {msg: 'Correo enviado, revise la bandeja de su cuenta', data: null, token: null});

    }
}

module.exports = UserController;