const User = require('../models/users.model');
const { cleanUserInput } = require('../helpers/utils');
const { hashCompare, createHash } = require('../helpers/bcrypt');
const checkJwt = require('../helpers/checkJwt');
const responseSuccess = require('../helpers/response-success');
const responseErrors = require('../helpers/response-errors');
const setJWT = require('../helpers/set-jwt');




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
            const pass = createHash(newpassword);
            
            // creo el objeto con la informacion del usuario a crear
            const newUser = {
                username,
                email,
                phone,
                active : true,
                indentification,
                password: pass
            }
            
            // creo el usuario en la base de datos
            const user = await User.create(newUser);
            
            // genero el token para el usuario creado */
            const token = setJWT({email, pass});

            // remuevo el password de la respuesta
            const data = cleanUserInput(user._doc);

            // retorno la respuesta formateada correctamente enviando el token y la informacion del usuario
            return responseSuccess(res, 200, {msg: 'User created', data, token});
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
            const { email, newpassword } = req.body
            const user = await User.findOne({ email, active: true });
            
            // verifico que el usuario exista y este activo
            if (!user) {
                return responseErrors(res, 404, 'User not found');
            }

            const isPasswordValid = hashCompare(newpassword, user.password);
            
            // verifico que el password sea valido
            if (!isPasswordValid) {
                return responseErrors(res, 401, 'Invalid password');
            }

            // genero el token para el usuario logueado */
            const {password} = user._doc;
            const token = setJWT({email,password});
            
            // remuevo el password de la respuesta
            const data = cleanUserInput(user._doc);

            return responseSuccess(res, 200, {msg: 'acceso exitoso', data, token});
        } catch (error) {
             // retorno la respuesta de error
             return responseErrors(res, 400, 'bad Request', error);  
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
            getUser.password = createHash(password);

        }
        console.log(getUser);

       const userUpdated = await User.findOneAndUpdate({ _id: id }, req.body, { new: true });
       
       if (!userUpdated) {
            return responseErrors(res, 404, 'User not found', null);
       }
       // remuevo el password de la respuesta
       const data = cleanUserInput(userUpdated._doc);
       
       if(getUser.password){
            const {password} = userUpdated._doc;
            const token = setJWT({email,password});
            return responseSuccess(res, 200, {msg: 'User updated', data, token });
        }       
        
        return responseSuccess(res, 200, {msg: 'User updated', data, token:setJWT({email,pass}) });
    }

    /**
     *  Recibe un id de usuario y elimina el usuario
     * @returns 
     */
    async deleteUser(req, res) {
        const {id,email} = req.body;

        if (!id) {
            return responseErrors(res, 400, 'Missing id', null);
        }
        const user = await User.findOne({ email, active: true });

        if (!user) {
            return responseErrors(res, 404, 'User not found', null);
        }

        const userDeleted = await User.findOneAndUpdate({ _id: id }, { active: false }, { new: true });

        return responseSuccess(res, 200, {msg: 'User deleted', data: null, token: null});
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
            return responseErrors(res, 404, 'User not found',null);
        }

        const newToken = setJWT({email,pass});
        const data = cleanUserInput(user._doc);

        return responseSuccess(res, 200, {msg: 'User by token', data, token: newToken});
    }
    
    /**
     *  Retorna la lista de todos los usuarios
     * @returns 
     */
    async getUsers(req, res) {

        // obtengo todos los usuarios activos de la base de datos
        const users = await User.find({ active: true });
        const data = users.map(user => cleanUserInput(user._doc));

        return responseSuccess(res, 200, {msg: 'User list', data:{ users:data, total: users.length  } })
    }


   /**
     *  Recibe un email, una lista de usuarios y el total de usuarios
     * @returns 
     */
    async getUserByEmail(req, res) {
        const {email} = req.body

        // obtengo todos los usuarios activos de la base de datos que coincidan con parcialmente con el email ingresado
        const users = await User.find({ email: { $regex: email, $options: 'i' }, active: true });

        if (!users) {
            return responseErrors(res, 404, 'User not found', null);
        }
        const data = users.map(user => cleanUserInput(user._doc));
        return responseSuccess(res, 200, {msg: 'Users found', data:{ users:data, total: users.length  }});
    }

    
    /**
     *  Recibe un nombre, una lista de usuarios y el total de usuarios
     * @returns 
     */
    async getUsersByName(req, res){
        const {name} = req.body
        const users = await User.find({ username: { $regex: name, $options: 'i' }, active: true });

        if (!users) {
            return responseErrors(res, 404, 'Users not found', null);
        }
        return responseSuccess(res, 200, {msg: 'Users found', data:{ users:users, total: users.length  }});
    }


    /**
     *  Recibe un email y envia un correo electronico con el password
     */
    async forgotPassword(req, res) {
        const { email } = req.body;
        const user = await User.findOne({ email, active: true });
        if (!user) {
            return responseErrors(res, 404, 'User not found', null);
        }
        const { password } = user._doc;

        const transporter = nodemailer.createTransport({
            
        })

    }
}

module.exports = UserController;